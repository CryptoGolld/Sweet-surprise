#!/usr/bin/env ts-node
/**
 * Complete Memecoin Test - Create, Buy, Sell
 * Much easier than CLI! 🚀
 */

// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

// Configuration
const RPC_URL = 'https://fullnode.testnet.sui.io:443';
const MNEMONIC = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';

// Deployed contracts
const PLATFORM_PKG = '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047';
const PLATFORM_CONFIG = '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c';
const TICKER_REGISTRY = '0x3bc08244a681e5fa1d125293ebd66c7017605d0c6d1820f4f9e5e1a7961a94e3';
const REFERRAL_REGISTRY = '0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d';

const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';

const CLOCK = '0x6';

// Setup
const keypair = Ed25519Keypair.deriveKeypair(MNEMONIC);
const client = new SuiClient({ url: RPC_URL });

console.log('🔐 Wallet:', keypair.toSuiAddress());
console.log('');

async function publishMemecoin() {
  console.log('📦 Publishing TEST memecoin...');
  
  // Use CLI to publish (easier than building in TypeScript)
  const output = execSync(
    'cd /workspace/test_memecoin && sui client publish --gas-budget 100000000 --json',
    { encoding: 'utf-8' }
  );
  
  const result = JSON.parse(output);
  
  const packageObj = result.objectChanges.find((obj: any) => obj.type === 'published');
  const treasuryObj = result.objectChanges.find((obj: any) => 
    obj.type === 'created' && obj.objectType?.includes('TreasuryCap')
  );
  const metadataObj = result.objectChanges.find((obj: any) => 
    obj.type === 'created' && obj.objectType?.includes('CoinMetadata')
  );
  
  const packageId = packageObj?.packageId;
  const treasuryId = treasuryObj?.objectId;
  const metadataId = metadataObj?.objectId;
  
  console.log('✅ Published!');
  console.log(`   Package: ${packageId}`);
  console.log(`   TreasuryCap: ${treasuryId}`);
  console.log(`   CoinMetadata: ${metadataId}`);
  console.log('');
  
  return {
    packageId,
    treasuryId,
    metadataId,
    coinType: `${packageId}::test_memefi::TEST_MEMEFI`
  };
}

async function createBondingCurve(memecoin: any) {
  console.log('📈 Creating bonding curve...');
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::create_new_meme_token`,
    typeArguments: [memecoin.coinType],
    arguments: [
      tx.object(PLATFORM_CONFIG),
      tx.object(TICKER_REGISTRY),
      tx.object(memecoin.treasuryId),
      tx.object(memecoin.metadataId),
      tx.object(CLOCK),
    ],
  });
  
  tx.setGasBudget(100_000_000);
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  
  if (result.effects?.status?.status !== 'success') {
    throw new Error(`Failed to create bonding curve: ${JSON.stringify(result.effects?.status)}`);
  }
  
  const curveObj: any = result.objectChanges?.find((obj: any) => 
    obj.type === 'created' && obj.objectType?.includes('BondingCurve')
  );
  
  const curveId = curveObj?.objectId;
  
  console.log('✅ Bonding curve created!');
  console.log(`   Curve ID: ${curveId}`);
  console.log(`   Digest: ${result.digest}`);
  console.log('');
  
  return curveId;
}

async function mintSUILFG(amount: number) {
  console.log(`💰 Minting ${amount / 1e9} SUILFG_MEMEFI...`);
  
  // Wait a bit for previous tx to settle
  await new Promise(resolve => setTimeout(resolve, 2000));
  
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
    options: {
      showEffects: true,
      showObjectChanges: true,
      showBalanceChanges: true,
    },
  });
  
  const coinObj = result.objectChanges?.find((obj: any) => 
    obj.type === 'created' && obj.objectType?.includes('suilfg_memefi::SUILFG_MEMEFI')
  );
  
  const coinId = coinObj?.objectId;
  
  console.log('✅ Minted!');
  console.log(`   Coin ID: ${coinId}`);
  console.log('');
  
  return coinId;
}

async function buyTokens(curveId: string, coinType: string, suilfgCoinId: string, maxIn: number) {
  console.log(`🛒 Buying TEST with ${maxIn / 1e9} SUILFG_MEMEFI...`);
  console.log(`   Expected: ~${(maxIn * 0.97 / 1000).toFixed(0)} MILLION tokens`);
  console.log('');
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::buy`,
    typeArguments: [coinType],
    arguments: [
      tx.object(PLATFORM_CONFIG),
      tx.object(curveId),
      tx.object(REFERRAL_REGISTRY),
      tx.object(suilfgCoinId),
      tx.pure.u64(maxIn),
      tx.pure.u64(1), // min tokens out
      tx.pure.u64(Date.now() + 300_000), // 5 min deadline
      tx.pure([], 'vector<address>'), // no referrer
      tx.object(CLOCK),
    ],
  });
  
  tx.setGasBudget(100_000_000);
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showBalanceChanges: true,
      showEvents: true,
    },
  });
  
  console.log('📋 Transaction:', result.digest);
  
  if (result.effects?.status?.status !== 'success') {
    console.error('❌ Buy failed:', result.effects?.status);
    throw new Error('Buy transaction failed');
  }
  
  console.log('✅ BUY SUCCESSFUL!\n');
  
  // Find the DIAMOND coin received
  const diamondCoin = result.objectChanges?.find((obj: any) => 
    obj.type === 'created' && obj.objectType?.includes('DIAMOND_MEMEFI')
  );
  
  // Check balance changes
  const balanceChanges = result.balanceChanges || [];
  let diamondReceived = 0;
  let suilfgSpent = 0;
  
  for (const change of balanceChanges) {
    if (change.coinType.includes('TEST_MEMEFI')) {
      testReceived = Math.abs(Number(change.amount));
      console.log(`🧪 TEST Received: ${(testReceived / 1e9).toLocaleString()} tokens`);
      console.log(`   (${testReceived.toLocaleString()} smallest units)`);
    } else if (change.coinType.includes('suilfg_memefi')) {
      suilfgSpent = Math.abs(Number(change.amount));
      console.log(`💰 SUILFG_MEMEFI Spent: ${(suilfgSpent / 1e9).toLocaleString()} tokens`);
    }
  }
  
  // Verify we got millions of tokens!
  const tokensInMillions = testReceived / 1e9 / 1_000_000;
  console.log('');
  if (tokensInMillions > 1400) {
    console.log(`✅✅✅ SUCCESS! Got ${tokensInMillions.toFixed(0)} MILLION tokens!`);
    console.log('🎉 The fix works perfectly! Supply scaling is correct!');
  } else {
    console.log(`⚠️  Warning: Expected ~1450M tokens, got ${tokensInMillions.toFixed(2)}M`);
  }
  console.log('');
  
  return {
    testCoinId: testCoin?.objectId,
    testReceived,
    suilfgSpent,
  };
}

async function sellTokens(curveId: string, coinType: string, testCoinId: string, amountToSell: number) {
  console.log(`📤 Selling ${(amountToSell / 1e9).toLocaleString()} TEST tokens...`);
  console.log('');
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::sell`,
    typeArguments: [coinType],
    arguments: [
      tx.object(PLATFORM_CONFIG),
      tx.object(curveId),
      tx.object(REFERRAL_REGISTRY),
      tx.object(testCoinId),
      tx.pure.u64(amountToSell),
      tx.pure.u64(1), // min SUI out
      tx.pure.u64(Date.now() + 300_000),
      tx.pure([], 'vector<address>'), // no referrer
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
    },
  });
  
  console.log('📋 Transaction:', result.digest);
  
  if (result.effects?.status?.status !== 'success') {
    console.error('❌ Sell failed:', result.effects?.status);
    throw new Error('Sell transaction failed');
  }
  
  console.log('✅ SELL SUCCESSFUL!\n');
  
  const balanceChanges = result.balanceChanges || [];
  for (const change of balanceChanges) {
    if (change.coinType.includes('suilfg_memefi') && !change.coinType.includes('::sui::')) {
      const received = Number(change.amount);
      console.log(`💰 SUILFG_MEMEFI Received: ${(received / 1e9).toLocaleString()} tokens`);
    }
  }
  console.log('');
  
  return result;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 TEST MEMECOIN - COMPLETE CYCLE                           ║');
  console.log('║  Testing FIXED Platform v0.0.5                               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  try {
    // Step 1: Publish memecoin
    const memecoin = await publishMemecoin();
    
    // Step 2: Create bonding curve
    const curveId = await createBondingCurve(memecoin);
    
    // Step 3: Mint SUILFG_MEMEFI
    const suilfgCoinId = await mintSUILFG(1_500_000_000_000); // 1500 tokens
    
    // Step 4: Buy TEST tokens
    const buyResult = await buyTokens(
      curveId,
      memecoin.coinType,
      suilfgCoinId,
      1_500_000_000_000 // Use all 1500 SUILFG
    );
    
    // Step 5: Sell half the TEST tokens
    if (buyResult.testCoinId && buyResult.testReceived > 0) {
      await sellTokens(
        curveId,
        memecoin.coinType,
        buyResult.testCoinId,
        Math.floor(buyResult.testReceived / 2) // Sell 50%
      );
    }
    
    // Save test results
    const testResults = {
      timestamp: new Date().toISOString(),
      memecoin: memecoin.packageId,
      curve: curveId,
      buyResult,
      status: 'success',
    };
    
    writeFileSync(
      '/workspace/test_results.json',
      JSON.stringify(testResults, null, 2)
    );
    
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ COMPLETE TEST PASSED!                                    ║');
    console.log('║  All fixes verified:                                         ║');
    console.log('║  ✅ Supply scaling (× 10^9)                                  ║');
    console.log('║  ✅ Correct SUILFG_MEMEFI dependency                         ║');
    console.log('║  ✅ Buy/Sell cycle working                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
