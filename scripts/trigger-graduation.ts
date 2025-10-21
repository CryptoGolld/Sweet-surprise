// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const CURVE_ID = '0x6a0f765484f8ea1d40061913348590556065b131a7f48e0d5ed4dd120ac4a874';
const COIN_TYPE = '0x0c6e5866d36a4d734e550ec4b5ebeef32d40eca675ddb64185b572d45f49bc4f::test_memefi::TEST_MEMEFI';
const PLATFORM_PKG = '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047';
const PLATFORM_CONFIG = '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c';
const CLOCK = '0x6';

console.log('🎓 Triggering Graduation...\n');

const tx = new Transaction();

// try_graduate(cfg, curve)
tx.moveCall({
  target: `${PLATFORM_PKG}::bonding_curve::try_graduate`,
  typeArguments: [COIN_TYPE],
  arguments: [
    tx.object(PLATFORM_CONFIG),
    tx.object(CURVE_ID),
  ],
});

tx.setGasBudget(100_000_000);

const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx,
  options: {
    showEffects: true,
    showEvents: true,
    showObjectChanges: true,
  },
});

console.log('📋 Transaction:', result.digest);
console.log('Status:', result.effects?.status?.status, '\n');

if (result.effects?.status?.status === 'success') {
  console.log('✅ GRADUATION TRIGGERED!\n');
  
  console.log('🔍 Events:');
  for (const event of result.events || []) {
    console.log(`   - ${event.type}`);
    if (event.parsedJson) {
      console.log('     ', JSON.stringify(event.parsedJson, null, 2));
    }
  }
  
  console.log('\n📦 Objects:');
  for (const obj of result.objectChanges || []) {
    if (obj.type === 'created' || obj.type === 'mutated') {
      console.log(`   ${obj.type}: ${obj['objectType']}`);
    }
  }
  
  // Check final status
  const curve = await client.getObject({ id: CURVE_ID, options: { showContent: true } });
  const fields: any = curve.data?.content?.['fields'];
  
  console.log('\n📊 Final Status:');
  console.log(`   Graduated: ${fields.graduated}`);
  console.log(`   LP Seeded: ${fields.lp_seeded}`);
  
} else {
  console.log('❌ Failed:', result.effects?.status?.error);
}
