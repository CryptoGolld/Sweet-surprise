// @ts-nocheck
/**
 * Step 1: Upgrade Platform to v0.0.5 with supply cap fix
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { readFileSync } from 'fs';
import { bcs } from '@mysten/sui/bcs';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const CURRENT_PACKAGE = '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047';
const UPGRADE_CAP = '0xde83c90c02cdba98c82be080eb31a9f74950467b962b2d0e5720a7ca596b483d';

console.log('🔄 UPGRADING PLATFORM TO v0.0.5\n');
console.log('   Current package:', CURRENT_PACKAGE);
console.log('   UpgradeCap:', UPGRADE_CAP);
console.log('');

// Load compiled modules
const basePath = '/workspace/suilfg_launch_with_memefi_testnet/build/suilfg_launch_memefi/bytecode_modules';
const moduleNames = ['bonding_curve', 'lp_locker', 'platform_config', 'referral_registry', 'ticker_registry'];

const modules = moduleNames.map(name => {
  const bytes = readFileSync(`${basePath}/${name}.mv`);
  console.log(`✅ Loaded ${name}.mv (${bytes.length} bytes)`);
  return Array.from(bytes);
});

// Dependencies
const dependencies = [
  '0x1',
  '0x2', 
  '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81', // test_sui_faucet
  '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb', // cetus
];

console.log('\n📝 Creating upgrade transaction...');

const tx = new Transaction();

const ticket = tx.moveCall({
  target: '0x2::package::authorize_upgrade',
  arguments: [
    tx.object(UPGRADE_CAP),
    tx.pure.u8(0),
    tx.pure(bcs.vector(bcs.u8()).serialize([])),
  ],
});

const receipt = tx.upgrade({
  modules,
  dependencies,
  package: CURRENT_PACKAGE,
  ticket,
});

tx.moveCall({
  target: '0x2::package::commit_upgrade',
  arguments: [tx.object(UPGRADE_CAP), receipt],
});

tx.setGasBudget(500_000_000);

console.log('🚀 Executing upgrade...\n');

const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx,
  options: {
    showEffects: true,
    showObjectChanges: true,
  },
});

console.log('✅ Transaction:', result.digest);

if (result.effects?.status?.status === 'success') {
  const published = result.objectChanges?.find((c: any) => c.type === 'published');
  
  console.log('\n🎉 UPGRADE SUCCESSFUL!');
  console.log('   New package:', published?.['packageId']);
  console.log('');
  console.log('Platform upgraded to v0.0.5 with fix:');
  console.log('   ✅ Supply cap: MAX_CURVE_SUPPLY (737M)');
  console.log('   ✅ Reserves: 263M for LP/team/burn');
  console.log('');
  
  // Save for next script
  const fs = await import('fs');
  fs.writeFileSync('/tmp/upgraded_package.txt', published?.['packageId'] || '');
  
} else {
  console.log('\n❌ Upgrade failed:', result.effects?.status);
  process.exit(1);
}
