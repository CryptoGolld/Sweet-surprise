// @ts-nocheck
/**
 * Complete the full graduation process:
 * 1. distribute_payouts (burn tokens)
 * 2. seed_pool_and_create_cetus_with_lock (create LP on Cetus)
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

// v0.0.5 Platform
const PLATFORM_PKG = '0x89e30287cbfd4bb53ea258146cbdac50165478b39020067f1adce731c9f41853';
const PLATFORM_CONFIG = '0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07';

// Cetus on Testnet
const CETUS_GLOBAL_CONFIG = '0x4f8c31bc431d5e976f627f5ca1a0b02c61aec32e0422c537c04a7840f6cc7901';
const CETUS_POOLS = '0xf1de91c72f54c053bb09be922afc9e2ec93f5a10f6c35c2558d4536f4c9b2c83';

// Our graduated curve
const CURVE = '0xfb78d6b706a3e5cff8423422dcd530cd0fcceecfa2fd5b86a3e598e3362e1611';
const COIN_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';
const COIN_METADATA = '0x82b41de2a5e8fb2ba16c5f1fa3bdacdefa3c1dbf0e4ce18bdbcf6b36c2f82ff6';

// SUILFG coin metadata
const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const SUILFG_METADATA = '0x4e1de62b2e51e9ad621b0eb5e0dd2ca3fc62c301ddb3cbc7fe9a34be54e67e98';

const CLOCK = '0x6';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🎓 COMPLETE GRADUATION → CETUS LP POOL                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
  // Step 1: Distribute payouts (burn tokens)
  console.log('🔥 Step 1: Distributing payouts (burning excess tokens)...\n');
  
  const distributeTx = new Transaction();
  distributeTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::distribute_payouts`,
    typeArguments: [COIN_TYPE],
    arguments: [
      distributeTx.object(PLATFORM_CONFIG),
      distributeTx.object(CURVE),
    ],
  });
  distributeTx.setGasBudget(100_000_000);
  
  const distributeRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: distributeTx,
    options: { showEffects: true },
  });
  
  console.log(`   📋 TX: ${distributeRes.digest}`);
  console.log(`   Status: ${distributeRes.effects?.status?.status}\n`);
  
  if (distributeRes.effects?.status?.status !== 'success') {
    console.log('   ❌ Failed:', distributeRes.effects?.status?.error);
    return;
  }
  
  console.log('   ✅ Payouts distributed!\n');
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Step 2: Create Cetus pool
  console.log('🏊 Step 2: Creating Cetus LP pool...\n');
  
  // Calculate sqrt price for 1:1 ratio (roughly)
  // sqrt(price) where price = 1
  // For Cetus: sqrt_price = sqrt(1) * 2^64 ≈ 18446744073709551616
  const SQRT_PRICE_1_TO_1 = '18446744073709551616';
  
  const poolTx = new Transaction();
  poolTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::seed_pool_and_create_cetus_with_lock`,
    typeArguments: [COIN_TYPE],
    arguments: [
      poolTx.object(PLATFORM_CONFIG),
      poolTx.object(CURVE),
      poolTx.object(CETUS_GLOBAL_CONFIG),
      poolTx.object(CETUS_POOLS),
      poolTx.pure.u32(60), // tick_spacing (standard for testnet)
      poolTx.pure.u128(SQRT_PRICE_1_TO_1), // initialize_sqrt_price
      poolTx.object(SUILFG_METADATA),
      poolTx.object(COIN_METADATA),
      poolTx.object(CLOCK),
    ],
  });
  poolTx.setGasBudget(500_000_000);
  
  console.log('   Creating pool with parameters:');
  console.log(`   - Tick spacing: 60`);
  console.log(`   - Initial price: ~1:1 (sqrt_price: ${SQRT_PRICE_1_TO_1})`);
  console.log(`   - Full range liquidity`);
  console.log(`   - LP position: PERMANENTLY LOCKED 🔒\n`);
  
  const poolRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: poolTx,
    options: { showEffects: true, showObjectChanges: true, showEvents: true },
  });
  
  console.log(`   📋 TX: ${poolRes.digest}`);
  console.log(`   Status: ${poolRes.effects?.status?.status}\n`);
  
  if (poolRes.effects?.status?.status !== 'success') {
    console.log('   ❌ Failed:', poolRes.effects?.status?.error);
    return;
  }
  
  console.log('   ✅ CETUS POOL CREATED!\n');
  
  // Extract pool info from events
  console.log('   📊 Pool Details:');
  
  for (const obj of poolRes.objectChanges || []) {
    if (obj.type === 'created' && obj.objectType?.includes('Pool')) {
      console.log(`      Pool ID: ${obj.objectId}`);
    }
    if (obj.type === 'created' && obj.objectType?.includes('LockedPosition')) {
      console.log(`      Locked Position: ${obj.objectId}`);
    }
  }
  
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🎉 GRADUATION COMPLETE!                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log('   ✅ Bonding curve: GRADUATED');
  console.log('   ✅ Payouts: DISTRIBUTED');
  console.log('   ✅ Cetus pool: CREATED');
  console.log('   ✅ LP position: PERMANENTLY LOCKED');
  console.log('');
  console.log('   🚀 Memecoin is now live on Cetus DEX!');
  console.log('   💧 Liquidity is permanently locked (cannot rug!)');
  console.log('');
  
  // Check final curve state
  await new Promise(r => setTimeout(r, 3000));
  
  const finalCurve = await client.getObject({ id: CURVE, options: { showContent: true } });
  const fields: any = finalCurve.data?.content?.['fields'];
  
  console.log('   📊 Final Curve State:');
  console.log(`      Supply: ${Number(fields.token_supply).toLocaleString()}`);
  console.log(`      Graduated: ${fields.graduated}`);
  console.log(`      LP Seeded: ${fields.lp_seeded}`);
  console.log('');
}

main().catch(console.error);
