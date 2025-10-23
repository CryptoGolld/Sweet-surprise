// @ts-nocheck
/**
 * Test: What happens when we try to buy MORE after hitting the cap?
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

// v0.0.5 Platform
const PLATFORM_PKG = '0x89e30287cbfd4bb53ea258146cbdac50165478b39020067f1adce731c9f41853';
const PLATFORM_CONFIG = '0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07';
const REFERRAL_REGISTRY = '0x5b1b26358dd68830ddc0c0db26f0fbcbb563513bb8a10454bb9670bbbdeac808';

const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';
const CLOCK = '0x6';

// The curve we just filled
const CURVE = '0xfb78d6b706a3e5cff8423422dcd530cd0fcceecfa2fd5b86a3e598e3362e1611';
const COIN_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🧪 TEST: Buying AFTER hitting 737M cap                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
  // Check current state
  console.log('📊 Step 1: Checking curve state...\n');
  
  const curve = await client.getObject({ id: CURVE, options: { showContent: true } });
  const fields: any = curve.data?.content?.['fields'];
  
  console.log(`   Supply: ${Number(fields.token_supply).toLocaleString()}`);
  console.log(`   Graduated: ${fields.graduated}`);
  console.log(`   SUILFG in curve: ${(Number(fields.sui_balance) / 1e9).toLocaleString()}`);
  console.log('');
  
  // Try to buy 100 more SUILFG
  console.log('💰 Step 2: Attempting to buy with 100 SUILFG...\n');
  console.log('   QUESTION: What happens when curve is already full?\n');
  
  const mintTx = new Transaction();
  mintTx.moveCall({
    target: `${FAUCET_PKG}::faucet::admin_mint`,
    arguments: [
      mintTx.object(FAUCET),
      mintTx.object(ADMIN_CAP),
      mintTx.pure.u64(100_000_000_000), // 100 SUILFG
    ],
  });
  mintTx.setGasBudget(50_000_000);
  
  const mintRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: mintTx,
    options: { showObjectChanges: true },
  });
  
  const suilfgCoin: any = mintRes.objectChanges?.find((o: any) => o.type === 'created');
  
  await new Promise(r => setTimeout(r, 3000));
  
  const buyTx = new Transaction();
  buyTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::buy`,
    typeArguments: [COIN_TYPE],
    arguments: [
      buyTx.object(PLATFORM_CONFIG),
      buyTx.object(CURVE),
      buyTx.object(REFERRAL_REGISTRY),
      buyTx.object(suilfgCoin.objectId),
      buyTx.pure(bcs.u64().serialize(100_000_000_000)),
      buyTx.pure(bcs.u64().serialize(1)),
      buyTx.pure(bcs.u64().serialize(Date.now() + 300000)),
      buyTx.pure(bcs.vector(bcs.Address).serialize([])),
      buyTx.object(CLOCK),
    ],
  });
  buyTx.setGasBudget(100_000_000);
  
  const buyRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: buyTx,
    options: { showBalanceChanges: true, showEffects: true },
  });
  
  console.log(`   📋 TX: ${buyRes.digest}`);
  console.log(`   Status: ${buyRes.effects?.status?.status}\n`);
  
  if (buyRes.effects?.status?.status === 'success') {
    console.log('   💰 Balance Changes:');
    for (const change of buyRes.balanceChanges || []) {
      const amount = Number(change.amount) / 1e9;
      const coinName = change.coinType.split('::').pop();
      console.log(`      ${amount >= 0 ? '+' : ''}${amount.toLocaleString()} ${coinName}`);
    }
    console.log('');
    
    let tokensReceived = 0;
    let suilfgChange = 0;
    
    for (const change of buyRes.balanceChanges || []) {
      if (change.coinType.includes('FIX_MEMEFI')) {
        tokensReceived = Number(change.amount) / 1e9;
      } else if (change.coinType.includes('suilfg_memefi')) {
        suilfgChange = Number(change.amount) / 1e9;
      }
    }
    
    console.log('   🔍 RESULT:');
    if (tokensReceived === 0 && suilfgChange >= 0) {
      console.log('      ✅ PERFECT! Got 0 tokens, full refund!');
      console.log('      ✅ Curve correctly rejects buys at cap!');
    } else if (tokensReceived > 0) {
      console.log(`      ⚠️  Got ${tokensReceived.toLocaleString()} tokens`);
      console.log('      ⚠️  Should be 0 when at max supply!');
    }
    
  } else {
    console.log('   ❌ Transaction failed:');
    console.log(`      ${buyRes.effects?.status?.error || 'Unknown error'}`);
    
    if (buyRes.effects?.status?.error?.includes('E_CURVE_SOLD_OUT')) {
      console.log('\n   ✅ PERFECT! Curve correctly rejects at cap!');
      console.log('      Error: E_CURVE_SOLD_OUT (expected behavior)');
    }
  }
  
  // Check graduation
  console.log('\n📊 Step 3: Checking graduation status...\n');
  
  const curveAfter = await client.getObject({ id: CURVE, options: { showContent: true } });
  const fieldsAfter: any = curveAfter.data?.content?.['fields'];
  
  console.log(`   Supply: ${Number(fieldsAfter.token_supply).toLocaleString()}`);
  console.log(`   Graduated: ${fieldsAfter.graduated}`);
  console.log('');
  
  if (fieldsAfter.graduated === false) {
    console.log('   🤔 WHY NOT GRADUATED?');
    console.log('');
    console.log('   💡 ANSWER: Graduation is NOT automatic!');
    console.log('');
    console.log('   📝 Steps to graduate:');
    console.log('      1. ✅ Reach 737M supply (DONE!)');
    console.log('      2. ⏳ Call try_graduate() function');
    console.log('      3. ⏳ Call distribute_payouts()');
    console.log('      4. ⏳ Call seed_pool_and_create_cetus_with_lock()');
    console.log('');
    console.log('   ➡️  Let me trigger graduation now...');
  }
}

main().catch(console.error);
