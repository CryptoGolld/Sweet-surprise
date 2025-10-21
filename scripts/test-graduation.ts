#!/usr/bin/env ts-node
/**
 * Test Bonding Curve Graduation & Pool Creation
 * Buy all remaining tokens to trigger LP creation
 */

// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

// Config
const RPC_URL = 'https://fullnode.testnet.sui.io:443';
const MNEMONIC = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';

// Platform
const PLATFORM_PKG = '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047';
const PLATFORM_CONFIG = '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c';
const REFERRAL_REGISTRY = '0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d';
const CLOCK = '0x6';

// Faucet
const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';

// Test memecoin from previous run
const COIN_TYPE = '0x0c6e5866d36a4d734e550ec4b5ebeef32d40eca675ddb64185b572d45f49bc4f::test_memefi::TEST_MEMEFI';
const CURVE_ID = '0x6a0f765484f8ea1d40061913348590556065b131a7f48e0d5ed4dd120ac4a874';

// Bonding curve constants (from contract)
const MAX_CURVE_SUPPLY = 737_000_000; // 737M tokens (whole units)
const DECIMALS = 9;

const keypair = Ed25519Keypair.deriveKeypair(MNEMONIC);
const client = new SuiClient({ url: RPC_URL });

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🎓 GRADUATION TEST - Buy Out & Create Pool                 ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');
console.log('🔐 Wallet:', keypair.toSuiAddress());
console.log('💎 Coin:', COIN_TYPE.split('::')[2]);
console.log('📈 Curve:', CURVE_ID);
console.log('');

async function getCurveStatus() {
  console.log('📊 Checking bonding curve status...');
  
  const curveObject = await client.getObject({
    id: CURVE_ID,
    options: { showContent: true },
  });
  
  if (curveObject.data?.content?.dataType !== 'moveObject') {
    throw new Error('Invalid curve object');
  }
  
  const fields: any = curveObject.data.content.fields;
  const tokenSupply = Number(fields.token_supply);
  const suiBalance = Number(fields.sui_balance);
  const graduated = fields.graduated;
  
  const remaining = MAX_CURVE_SUPPLY - tokenSupply;
  
  console.log(`   Current supply: ${tokenSupply.toLocaleString()} tokens`);
  console.log(`   Remaining: ${remaining.toLocaleString()} tokens`);
  console.log(`   SUI balance: ${(suiBalance / 1e9).toLocaleString()} SUILFG`);
  console.log(`   Graduated: ${graduated}`);
  console.log('');
  
  return { tokenSupply, remaining, graduated, suiBalance };
}

async function mintSUILFG(amount: number) {
  console.log(`💰 Minting ${(amount / 1e9).toLocaleString()} SUILFG_MEMEFI...`);
  
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for previous tx
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${FAUCET_PKG}::faucet::admin_mint`,
    arguments: [
      tx.object(FAUCET),
      tx.object(ADMIN_CAP),
      tx.pure.u64(amount),
    ],
  });
  
  tx.setGasBudget(50_000_000);
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showObjectChanges: true },
  });
  
  const coinObj: any = result.objectChanges?.find((obj: any) => 
    obj.type === 'created' && obj.objectType?.includes('suilfg_memefi::SUILFG_MEMEFI')
  );
  
  console.log(`✅ Minted! Coin: ${coinObj?.objectId}\n`);
  return coinObj?.objectId;
}

async function buyTokens(suilfgCoinId: string, maxIn: number, description: string) {
  console.log(`🛒 ${description}`);
  console.log(`   Using ${(maxIn / 1e9).toLocaleString()} SUILFG_MEMEFI\n`);
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::buy`,
    typeArguments: [COIN_TYPE],
    arguments: [
      tx.object(PLATFORM_CONFIG),
      tx.object(CURVE_ID),
      tx.object(REFERRAL_REGISTRY),
      tx.object(suilfgCoinId),
      tx.pure(bcs.u64().serialize(maxIn)),
      tx.pure(bcs.u64().serialize(1)),
      tx.pure(bcs.u64().serialize(Date.now() + 300000)),
      tx.pure(bcs.vector(bcs.Address).serialize([])),
      tx.object(CLOCK),
    ],
  });
  
  tx.setGasBudget(100_000_000);
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showBalanceChanges: true,
      showEvents: true,
    },
  });
  
  console.log('📋 Transaction:', result.digest);
  
  if (result.effects?.status?.status !== 'success') {
    console.error('❌ Buy failed:', result.effects?.status);
    throw new Error('Buy failed');
  }
  
  console.log('✅ Buy successful!\n');
  
  // Parse results
  let tokensReceived = 0;
  let suilfgSpent = 0;
  
  for (const change of result.balanceChanges || []) {
    if (change.coinType.includes('TEST_MEMEFI')) {
      tokensReceived = Math.abs(Number(change.amount));
      console.log(`   💎 Received: ${(tokensReceived / 1e9).toLocaleString()} tokens`);
    } else if (change.coinType.includes('suilfg_memefi')) {
      suilfgSpent = Math.abs(Number(change.amount));
      console.log(`   💰 Spent: ${(suilfgSpent / 1e9).toLocaleString()} SUILFG`);
    }
  }
  
  // Check for graduation event
  const events = result.events || [];
  for (const event of events) {
    if (event.type.includes('GraduationEvent') || event.type.includes('PoolCreated')) {
      console.log('\n🎓🎓🎓 GRADUATION EVENT DETECTED! 🎓🎓🎓');
      console.log('Event:', JSON.stringify(event, null, 2));
    }
  }
  
  console.log('');
  return { tokensReceived, suilfgSpent };
}

async function main() {
  try {
    // Step 1: Check current status
    let status = await getCurveStatus();
    
    if (status.graduated) {
      console.log('✅ Curve already graduated! Pool should exist.');
      return;
    }
    
    if (status.remaining <= 0) {
      console.log('✅ Curve is sold out! Checking graduation...');
      return;
    }
    
    // Step 2: Calculate how much SUILFG we need
    // Approximate: We need to buy ~remaining tokens
    // Price increases, so we'll need more SUILFG than linear
    // Let's be generous and use 2x the remaining supply as SUILFG amount
    
    const estimatedSUILFG = Math.ceil(status.remaining * 2 * 1e9); // 2x safety margin
    
    console.log('📐 Calculation:');
    console.log(`   Remaining tokens: ${status.remaining.toLocaleString()}`);
    console.log(`   Estimated SUILFG needed: ${(estimatedSUILFG / 1e9).toLocaleString()}`);
    console.log(`   (Using 2x safety margin for price increases)\n`);
    
    // Step 3: Mint enough SUILFG
    const suilfgCoin = await mintSUILFG(estimatedSUILFG);
    
    // Step 4: Buy all remaining tokens!
    console.log('🚀 BUYING OUT THE CURVE...\n');
    
    await buyTokens(
      suilfgCoin,
      estimatedSUILFG,
      'Final buyout - triggering graduation!'
    );
    
    // Step 5: Check final status
    console.log('🔍 Checking final curve status...\n');
    status = await getCurveStatus();
    
    if (status.graduated) {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║  🎊 GRADUATION SUCCESSFUL! 🎊                                ║');
      console.log('║  Liquidity pool should be created on Cetus!                  ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
      
      console.log('✅ Curve sold out:', status.tokenSupply, '/', MAX_CURVE_SUPPLY);
      console.log('✅ Graduated:', status.graduated);
      console.log('✅ Ready for trading on DEX!');
    } else {
      console.log('⚠️  Not graduated yet. May need another buy to trigger.');
      console.log(`   Current: ${status.tokenSupply} / ${MAX_CURVE_SUPPLY}`);
      console.log(`   Remaining: ${status.remaining}`);
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
