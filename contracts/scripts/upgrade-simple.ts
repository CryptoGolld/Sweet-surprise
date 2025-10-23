import 'dotenv/config';
import { readFileSync } from 'fs';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

// Simpler approach: Use sui client publish output format
const UPGRADE_CAP = process.env.UPGRADE_CAP_ID || '0x731130f00c7b3b07104d50b97b716fe8cc256cddde53e5f4e2ebf42c612f858d';
const PACKAGE_ID = process.env.CURRENT_PACKAGE_ID || '0x731130f00c7b3b07104d50b97b716fe8cc256cddde53e5f4e2ebf42c612f858d';

async function upgradeWithSuiPublish() {
  const mnemonic = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
  
  console.log('🔐 Signer:', keypair.toSuiAddress());
  console.log('📦 Package to upgrade:', PACKAGE_ID);
  console.log('🔑 UpgradeCap:', UPGRADE_CAP);
  
  // Read compiled modules from build
  const buildPath = '/workspace/suilfg_launch_with_memefi_testnet/build/suilfg_launch_memefi';
  
  const modules: Uint8Array[] = [];
  const moduleNames = [
    'bonding_curve',
    'lp_locker',
    'platform_config',
    'referral_registry',
    'ticker_registry',
  ];
  
  for (const name of moduleNames) {
    const modulePath = `${buildPath}/bytecode_modules/${name}.mv`;
    const moduleBytes = readFileSync(modulePath);
    modules.push(moduleBytes);
    console.log(`✅ Loaded module: ${name} (${moduleBytes.length} bytes)`);
  }
  
  // Get dependencies from current package
  const dependencies = [
    '0x1', // Stdlib
    '0x2', // Sui framework
    '0x443b752b268566bcc4c421afe5b055435766da9fce42a4801c77033b5a0b2999', // test_sui_faucet
    // Add Cetus dependencies
  ];
  
  const tx = new Transaction();
  
  // Authorize the upgrade
  const upgradeTicket = tx.moveCall({
    target: '0x2::package::authorize_upgrade',
    arguments: [
      tx.object(UPGRADE_CAP),
      tx.pure.u8(0), // Compatible upgrade policy
      tx.pure.vector('u8', []), // Digest placeholder
    ],
  });
  
  // Perform the upgrade
  const upgradeReceipt = tx.upgrade({
    modules,
    dependencies,
    package: PACKAGE_ID,
    ticket: upgradeTicket,
  });
  
  // Commit the upgrade
  tx.moveCall({
    target: '0x2::package::commit_upgrade',
    arguments: [tx.object(UPGRADE_CAP), upgradeReceipt],
  });
  
  tx.setGasBudget(500_000_000);
  
  console.log('\n📝 Executing upgrade...');
  
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
    console.log('🎉 Upgrade successful!');
    
    const published = result.objectChanges?.find((c) => c.type === 'published');
    if (published && 'packageId' in published) {
      console.log('📦 New Package:', published.packageId);
    }
  } else {
    console.error('❌ Failed:', result.effects?.status);
  }
}

upgradeWithSuiPublish().catch(console.error);
