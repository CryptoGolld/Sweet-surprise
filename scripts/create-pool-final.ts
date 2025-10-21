// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const PLATFORM_PKG = '0x89e30287cbfd4bb53ea258146cbdac50165478b39020067f1adce731c9f41853';
const PLATFORM_CONFIG = '0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07';

const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x26579e72429b00a833c1f7b892c059f1b23a89cb0e749c5a2f77a5e72d70c0e5';

const CURVE = '0xfb78d6b706a3e5cff8423422dcd530cd0fcceecfa2fd5b86a3e598e3362e1611';
const COIN_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';
const CLOCK = '0x6';

console.log('🔍 Step 1: Finding metadata objects...\n');

// Query faucet publish to find SUILFG metadata
const faucetPublishTx = '9vwUr8f5QAjsEGV4aKdYMxTcFSzCnSCSYoNjYhHAg39t';
const faucetTxData = await client.getTransactionBlock({
  digest: faucetPublishTx,
  options: { showObjectChanges: true },
});

let suilfgMetadata = null;
for (const obj of faucetTxData.objectChanges || []) {
  if (obj.type === 'created' && obj.objectType?.includes('CoinMetadata') && obj.objectType?.includes('SUILFG')) {
    suilfgMetadata = obj.objectId;
    console.log(`   ✅ SUILFG metadata: ${suilfgMetadata}`);
  }
}

// Find FIX_MEMEFI metadata from our test coin publish
// Search recent transactions
const address = '0x488e0c6d14c2334da9d72a309e7b63b37fdf93f2faa910e203aa7f73260df25f';
const txs = await client.queryTransactionBlocks({
  filter: { FromAddress: address },
  options: { showObjectChanges: true },
  limit: 50,
});

let fixMetadata = null;
for (const tx of txs.data) {
  for (const obj of tx.objectChanges || []) {
    if (obj.type === 'created' && 
        obj.objectType?.includes('CoinMetadata') && 
        obj.objectType?.includes('0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6')) {
      fixMetadata = obj.objectId;
      console.log(`   ✅ FIX_MEMEFI metadata: ${fixMetadata}`);
      break;
    }
  }
  if (fixMetadata) break;
}

if (!suilfgMetadata || !fixMetadata) {
  console.log('\n❌ Could not find metadata objects!');
  console.log(`   SUILFG: ${suilfgMetadata || 'NOT FOUND'}`);
  console.log(`   FIX: ${fixMetadata || 'NOT FOUND'}`);
  process.exit(1);
}

console.log('\n🏊 Step 2: Creating Cetus LP pool...\n');

const SQRT_PRICE_1_TO_1 = '18446744073709551616';

const tx = new Transaction();
tx.moveCall({
  target: `${PLATFORM_PKG}::bonding_curve::seed_pool_and_create_cetus_with_lock`,
  typeArguments: [COIN_TYPE],
  arguments: [
    tx.object(PLATFORM_CONFIG),
    tx.object(CURVE),
    tx.object(CETUS_CONFIG),
    tx.object(CETUS_POOLS),
    tx.pure.u32(60),
    tx.pure.u128(SQRT_PRICE_1_TO_1),
    tx.object(suilfgMetadata),
    tx.object(fixMetadata),
    tx.object(CLOCK),
  ],
});
tx.setGasBudget(500_000_000);

console.log('   Creating pool with:');
console.log(`   - Tick spacing: 60`);
console.log(`   - Initial price: ~1:1`);
console.log(`   - LP: PERMANENTLY LOCKED 🔒\n`);

const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx,
  options: { showEffects: true, showObjectChanges: true, showEvents: true },
});

console.log(`   📋 TX: ${result.digest}`);
console.log(`   Status: ${result.effects?.status?.status}\n`);

if (result.effects?.status?.status === 'success') {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🎉 CETUS POOL CREATED!                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  for (const obj of result.objectChanges || []) {
    if (obj.type === 'created') {
      const name = obj.objectType?.split('::').pop() || 'Object';
      console.log(`   ${name}: ${obj.objectId}`);
    }
  }
  
  console.log('\n   ✅ Bonding curve: FULLY GRADUATED');
  console.log('   ✅ LP position: PERMANENTLY LOCKED');
  console.log('   ✅ Memecoin: LIVE ON CETUS DEX');
  console.log('\n   🚀 Platform v0.0.5 - Complete Success!');
  
} else {
  console.log('   ❌ Failed:', result.effects?.status?.error);
}
