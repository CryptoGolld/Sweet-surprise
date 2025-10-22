// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const POOL_CREATOR_V2_PKG = '0x19dd42e05fa6c9988a60d30686ee3feb776672b5547e328d6dab16563da65293';
const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2';

const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';

const FIX_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';
const FIX_METADATA = '0x706dfc0b9db9c92c6d8f908d273b21484f3a9ce634afb8f9ba9050643319ea48';

const SUILFG_COIN = '0x103b84c2331188645e3de46eb5a8cc12327cb86a16d69f78afbee7150098feb5';
const FIX_COIN = '0x1bb4c6d370054c264cf97a4a0f157ed14a1171a4be0d043b41428204aa1ba44b';

const CLOCK = '0x6';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🎯 FINAL TEST: pool_creator_v2                             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
  console.log('Using:');
  console.log(`  Package: ${POOL_CREATOR_V2_PKG}`);
  console.log(`  SUILFG: ${SUILFG_COIN}`);
  console.log(`  FIX: ${FIX_COIN}\n`);
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${POOL_CREATOR_V2_PKG}::pool_creator_v2::create_pool_v2`,
    typeArguments: [SUILFG_TYPE, FIX_TYPE],
    arguments: [
      tx.object(CETUS_CONFIG),
      tx.object(CETUS_POOLS),
      tx.pure.u32(60),
      tx.pure.u128('18446744073709551616'),
      tx.pure.string('SUILFG/FIX Pool'),
      tx.pure.u32(4294523),
      tx.pure.u32(4295323),
      tx.object(SUILFG_COIN),
      tx.object(FIX_COIN),
      tx.object(SUILFG_METADATA),
      tx.object(FIX_METADATA),
      tx.pure.bool(false),
      tx.object(CLOCK),
    ],
  });
  
  tx.setGasBudget(500_000_000);
  
  console.log('🚀 Creating pool...\n');
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true, showEvents: true },
  });
  
  console.log(`TX: ${result.digest}`);
  console.log(`Status: ${result.effects?.status?.status}\n`);
  
  if (result.effects?.status?.status === 'success') {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  🎉🎉🎉 POOL CREATED!!! 🎉🎉🎉                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('✅ pool_creator_v2 wrapper works!');
    console.log('✅ This is the solution!\n');
    
    console.log('Created objects:');
    for (const obj of result.objectChanges || []) {
      if (obj.type === 'created') {
        const name = obj.objectType?.split('::').pop() || 'Object';
        console.log(`   ${name}: ${obj.objectId}`);
      }
    }
    
    console.log('\nEvents:');
    for (const evt of result.events || []) {
      if (evt.type.includes('CreatePoolEvent')) {
        console.log('   ✅ CreatePoolEvent emitted!');
      }
    }
    
  } else {
    console.log(`❌ Failed: ${result.effects?.status?.error}`);
  }
}

main().catch(console.error);
