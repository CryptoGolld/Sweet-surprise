// @ts-nocheck
/**
 * TEST: Use pool_creator_v2 wrapper directly!
 * This is an entry function so we can call it from TypeScript
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

// pool_creator_v2 package from the successful event
const POOL_CREATOR_V2_PKG = '0x19dd42e05fa6c9988a60d30686ee3feb776672b5547e328d6dab16563da65293';

const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2';

const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';

// Working coin from earlier
const WORKING_TYPE = '0x9c3a8d56488c7cdae0ab7f245415bce7e28c629efb8e8db2a98e32780f74061c::working_memefi::WORKING_MEMEFI';
const WORKING_METADATA = '0x38aa5514a58b14cb4862955ee9cb580ed2f7cf608c94da8e657b6df2732af895';

const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';

const CLOCK = '0x6';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🧪 TESTING pool_creator_v2 WRAPPER                         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log(`Using pool_creator_v2 package: ${POOL_CREATOR_V2_PKG}\n`);

async function main() {
  // Get coins
  console.log('📦 Getting coins...\n');
  
  const objects = await client.getOwnedObjects({
    owner: keypair.getPublicKey().toSuiAddress(),
    options: { showType: true },
  });
  
  let suilfgCoin = null;
  let workingCoin = null;
  
  for (const obj of objects.data) {
    const type = obj.data?.type || '';
    if (type.includes('SUILFG_MEMEFI') && type.includes('Coin<') && !suilfgCoin) {
      suilfgCoin = obj.data.objectId;
    }
    if (type.includes('WORKING_MEMEFI') && type.includes('Coin<') && !workingCoin) {
      workingCoin = obj.data.objectId;
    }
    if (suilfgCoin && workingCoin) break;
  }
  
  if (!suilfgCoin || !workingCoin) {
    console.log('⚠️  Need to mint coins first...\n');
    
    const mintTx = new Transaction();
    
    const suilfg = mintTx.moveCall({
      target: `${FAUCET_PKG}::faucet::admin_mint`,
      arguments: [
        mintTx.object(FAUCET),
        mintTx.object(ADMIN_CAP),
        mintTx.pure.u64(10_000_000_000_000), // 10K SUILFG
      ],
    });
    
    mintTx.setGasBudget(50_000_000);
    
    const mintRes = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: mintTx,
      options: { showObjectChanges: true },
    });
    
    for (const obj of mintRes.objectChanges || []) {
      if (obj.type === 'created' && obj.objectType?.includes('SUILFG')) {
        suilfgCoin = obj.objectId;
      }
    }
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Re-query for WORKING coin
    const objects2 = await client.getOwnedObjects({
      owner: keypair.getPublicKey().toSuiAddress(),
      options: { showType: true },
    });
    
    for (const obj of objects2.data) {
      if (obj.data?.type?.includes('WORKING_MEMEFI')) {
        workingCoin = obj.data.objectId;
        break;
      }
    }
  }
  
  console.log(`✅ SUILFG coin: ${suilfgCoin}`);
  console.log(`✅ WORKING coin: ${workingCoin}\n`);
  
  // Create pool using pool_creator_v2 wrapper!
  console.log('🏊 Creating pool with pool_creator_v2 wrapper...\n');
  
  const tx = new Transaction();
  
  // Call the WRAPPER (entry function)
  tx.moveCall({
    target: `${POOL_CREATOR_V2_PKG}::pool_creator_v2::create_pool_v2`,
    typeArguments: [SUILFG_TYPE, WORKING_TYPE],
    arguments: [
      tx.object(CETUS_CONFIG),
      tx.object(CETUS_POOLS),
      tx.pure.u32(60), // tick_spacing
      tx.pure.u128('18446744073709551616'), // sqrt_price
      tx.pure.string('SUILFG/WORKING Test'),
      tx.pure.u32(4294523), // tick_lower
      tx.pure.u32(4295323), // tick_upper
      tx.object(suilfgCoin), // &mut Coin (will be passed as mutable reference)
      tx.object(workingCoin), // &mut Coin
      tx.object(SUILFG_METADATA),
      tx.object(WORKING_METADATA),
      tx.pure.bool(false), // fix_amount_a
      tx.object(CLOCK),
    ],
  });
  
  tx.setGasBudget(500_000_000);
  
  console.log('🚀 Executing...\n');
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true, showEvents: true },
  });
  
  console.log(`TX: ${result.digest}`);
  console.log(`Status: ${result.effects?.status?.status}\n`);
  
  if (result.effects?.status?.status === 'success') {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  🎉🎉🎉 IT WORKS!!! 🎉🎉🎉                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('✅ Pool created using pool_creator_v2 wrapper!');
    console.log('✅ The wrapper handled everything correctly!\n');
    
    console.log('Created objects:');
    for (const obj of result.objectChanges || []) {
      if (obj.type === 'created') {
        console.log(`   ${obj.objectType?.split('::').pop()}: ${obj.objectId}`);
      }
    }
    
    console.log('\n🎯 NOW WE KNOW THE FIX:');
    console.log(`   Use package: ${POOL_CREATOR_V2_PKG}`);
    console.log('   Module: pool_creator_v2');
    console.log('   Function: create_pool_v2');
    console.log('   This wrapper handles amount calculation!');
    
  } else {
    console.log(`❌ Failed: ${result.effects?.status?.error}`);
    console.log('\nMight need to try the other package address:');
    console.log('   0x2918cf39850de6d5d94d8196dc878c8c722cd79db659318e00bff57fbb4e2ede');
  }
}

main().catch(console.error);
