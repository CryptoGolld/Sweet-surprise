// @ts-nocheck
/**
 * Step 2: Test creating Cetus pool with the found Pools object
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

// Platform
const PLATFORM_PKG = '0x89e30287cbfd4bb53ea258146cbdac50165478b39020067f1adce731c9f41853';
const PLATFORM_CONFIG = '0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07';

// Cetus (with NEW Pools object you found!)
const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2'; // ✨ NEW!

// Metadata
const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';
const FIX_METADATA = '0x706dfc0b9db9c92c6d8f908d273b21484f3a9ce634afb8f9ba9050643319ea48';

// Curve
const CURVE = '0xfb78d6b706a3e5cff8423422dcd530cd0fcceecfa2fd5b86a3e598e3362e1611';
const COIN_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';

const CLOCK = '0x6';

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  🏊 TESTING CETUS POOL CREATION                             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('Using addresses:');
console.log(`   Platform: ${PLATFORM_PKG}`);
console.log(`   Cetus Config: ${CETUS_CONFIG}`);
console.log(`   Cetus Pools: ${CETUS_POOLS} ✨ NEW!\n`);

console.log('📊 Pool parameters:');
console.log(`   Pair: SUILFG_MEMEFI / FIX_MEMEFI`);
console.log(`   Tick spacing: 60`);
console.log(`   Initial price: ~1:1`);
console.log(`   Liquidity: Full range`);
console.log(`   LP position: PERMANENTLY LOCKED 🔒\n`);

const SQRT_PRICE_1_TO_1 = '18446744073709551616';

const tx = new Transaction();

tx.moveCall({
  target: `${PLATFORM_PKG}::bonding_curve::seed_pool_and_create_cetus_with_lock`,
  typeArguments: [COIN_TYPE],
  arguments: [
    tx.object(PLATFORM_CONFIG),
    tx.object(CURVE),
    tx.object(CETUS_CONFIG),
    tx.object(CETUS_POOLS), // Using the Pools object you found!
    tx.pure.u32(60), // tick_spacing
    tx.pure.u128(SQRT_PRICE_1_TO_1), // initialize_sqrt_price
    tx.object(SUILFG_METADATA),
    tx.object(FIX_METADATA),
    tx.object(CLOCK),
  ],
});

tx.setGasBudget(500_000_000);

console.log('🚀 Creating Cetus pool...\n');

try {
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true, showEvents: true },
  });
  
  console.log(`📋 TX: ${result.digest}`);
  console.log(`Status: ${result.effects?.status?.status}\n`);
  
  if (result.effects?.status?.status === 'success') {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  🎉🎉🎉 CETUS POOL CREATED! 🎉🎉🎉                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('📦 Created Objects:');
    for (const obj of result.objectChanges || []) {
      if (obj.type === 'created') {
        const typeName = obj.objectType?.split('::').pop() || 'Object';
        console.log(`   ${typeName}: ${obj.objectId}`);
        
        if (obj.objectType?.includes('Pool')) {
          console.log(`      🏊 This is your Cetus pool!`);
        }
        if (obj.objectType?.includes('Position') || obj.objectType?.includes('LockedPosition')) {
          console.log(`      🔒 LP position permanently locked!`);
        }
      }
    }
    
    console.log('\n✅ COMPLETE SUCCESS!');
    console.log('   ✅ Pools object works perfectly!');
    console.log('   ✅ Cetus pool created automatically!');
    console.log('   ✅ LP position permanently locked!');
    console.log('   ✅ Memecoin LIVE on Cetus DEX!\n');
    
    console.log('🎯 The Pools address is CORRECT:');
    console.log(`   ${CETUS_POOLS}\n`);
    
  } else {
    console.log('❌ Transaction failed!');
    console.log(`   Error: ${result.effects?.status?.error}\n`);
    
    console.log('This means the Pools object might not be correct,');
    console.log('or there might be another issue with the pool creation.');
  }
  
} catch (e: any) {
  console.log('❌ Error executing transaction:', e.message);
  console.log('\nThis could mean:');
  console.log('   - Pools object is wrong type');
  console.log('   - Pools object has been deprecated');
  console.log('   - Other parameter issue\n');
}
