// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

// pool_creator_v2 package
const POOL_CREATOR_V2_PKG = '0x19dd42e05fa6c9988a60d30686ee3feb776672b5547e328d6dab16563da65293';
const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2';

const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';

// Use WORKING coin from earlier successful graduation
const WORKING_TYPE = '0x9c3a8d56488c7cdae0ab7f245415bce7e28c629efb8e8db2a98e32780f74061c::working_memefi::WORKING_MEMEFI';
const WORKING_METADATA = '0x38aa5514a58b14cb4862955ee9cb580ed2f7cf608c94da8e657b6df2732af895';

const CLOCK = '0x6';

console.log('🧪 Testing pool_creator_v2 with existing coins\n');

async function main() {
  const address = keypair.getPublicKey().toSuiAddress();
  
  console.log('Finding coins...\n');
  
  const objects = await client.getOwnedObjects({
    owner: address,
    options: { showType: true, showContent: true },
  });
  
  let suilfgCoin = null;
  let workingCoin = null;
  
  for (const obj of objects.data) {
    const type = obj.data?.type || '';
    if (type.includes('SUILFG_MEMEFI') && type.includes('Coin<')) {
      suilfgCoin = obj.data.objectId;
      console.log(`Found SUILFG: ${suilfgCoin}`);
    }
    if (type.includes('WORKING_MEMEFI') && type.includes('Coin<')) {
      workingCoin = obj.data.objectId;
      console.log(`Found WORKING: ${workingCoin}`);
    }
  }
  
  if (!suilfgCoin || !workingCoin) {
    console.log('\n❌ Missing coins. Available coins:');
    for (const obj of objects.data) {
      const type = obj.data?.type || '';
      if (type.includes('Coin<')) {
        const coinType = type.match(/Coin<(.+)>/)?.[1] || 'Unknown';
        console.log(`   ${coinType.split('::').pop()}: ${obj.data.objectId}`);
      }
    }
    return;
  }
  
  console.log('\n🏊 Creating pool with pool_creator_v2...\n');
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${POOL_CREATOR_V2_PKG}::pool_creator_v2::create_pool_v2`,
    typeArguments: [SUILFG_TYPE, WORKING_TYPE],
    arguments: [
      tx.object(CETUS_CONFIG),
      tx.object(CETUS_POOLS),
      tx.pure.u32(60),
      tx.pure.u128('18446744073709551616'),
      tx.pure.string('Test Pool'),
      tx.pure.u32(4294523),
      tx.pure.u32(4295323),
      tx.object(suilfgCoin),
      tx.object(workingCoin),
      tx.object(SUILFG_METADATA),
      tx.object(WORKING_METADATA),
      tx.pure.bool(false),
      tx.object(CLOCK),
    ],
  });
  
  tx.setGasBudget(500_000_000);
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true },
  });
  
  console.log(`TX: ${result.digest}`);
  console.log(`Status: ${result.effects?.status?.status}\n`);
  
  if (result.effects?.status?.status === 'success') {
    console.log('🎉🎉🎉 IT WORKS!!! 🎉🎉🎉\n');
    console.log('Pool created with pool_creator_v2 wrapper!\n');
    
    for (const obj of result.objectChanges || []) {
      if (obj.type === 'created') {
        console.log(`   ${obj.objectType?.split('::').pop()}: ${obj.objectId}`);
      }
    }
    
  } else {
    console.log(`Failed: ${result.effects?.status?.error}`);
  }
}

main().catch(console.error);
