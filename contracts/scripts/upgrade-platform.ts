import 'dotenv/config';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { fromB64 } from '@mysten/sui/utils';

// Configuration
const UPGRADE_CAP_ID = process.env.UPGRADE_CAP_ID!;
const PACKAGE_PATH = process.env.PACKAGE_PATH || '/workspace/suilfg_launch_with_memefi_testnet';
const RPC_URL = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';

// Keypair from mnemonic
function getKeypair(): Ed25519Keypair {
  const mnemonic = process.env.MNEMONIC || 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
  return Ed25519Keypair.deriveKeypair(mnemonic);
}

async function buildPackage(): Promise<{ modules: string[]; dependencies: string[] }> {
  console.log('📦 Building Move package...');
  
  // Build the package
  execSync('sui move build --dump-bytecode-as-base64 --path ' + PACKAGE_PATH, {
    stdio: 'inherit',
  });
  
  // Read the compiled modules
  const buildOutput = execSync(
    `sui move build --dump-bytecode-as-base64 --path ${PACKAGE_PATH} 2>/dev/null`,
    { encoding: 'utf-8' }
  );
  
  // Parse modules and dependencies from build output
  const modules: string[] = [];
  const dependencies: string[] = [];
  
  // The build output contains base64 encoded modules
  // We need to extract them from the build directory
  const modulesJson = JSON.parse(
    readFileSync(`${PACKAGE_PATH}/build/suilfg_launch_memefi/bytecode_modules_base64.json`, 'utf-8')
  );
  
  for (const moduleName in modulesJson) {
    modules.push(modulesJson[moduleName]);
  }
  
  // Read dependencies from build output
  const buildData = JSON.parse(
    readFileSync(`${PACKAGE_PATH}/build/suilfg_launch_memefi/package-digest.json`, 'utf-8')
  );
  
  Object.values(buildData).forEach((dep: any) => {
    if (typeof dep === 'string' && dep.startsWith('0x')) {
      dependencies.push(dep);
    }
  });
  
  console.log(`✅ Built ${modules.length} modules`);
  console.log(`📚 Found ${dependencies.length} dependencies`);
  
  return { modules, dependencies };
}

async function upgradeContract() {
  const keypair = getKeypair();
  const client = new SuiClient({ url: RPC_URL });
  
  console.log('🔐 Signer address:', keypair.toSuiAddress());
  console.log('🔄 Upgrading package with UpgradeCap:', UPGRADE_CAP_ID);
  
  // Build the package
  const { modules, dependencies } = await buildPackage();
  
  // Create upgrade transaction
  const tx = new Transaction();
  
  // Authorize upgrade
  const ticket = tx.moveCall({
    target: '0x2::package::authorize_upgrade',
    arguments: [
      tx.object(UPGRADE_CAP_ID),
      tx.pure.u8(0), // Policy: UpgradePolicy::COMPATIBLE
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(''))), // Digest (empty for now)
    ],
  });
  
  // Commit upgrade with compiled modules
  const receipt = tx.upgrade({
    modules,
    dependencies,
    package: UPGRADE_CAP_ID.split('::')[0], // Extract package ID from UpgradeCap
    ticket,
  });
  
  // Commit the upgrade
  tx.moveCall({
    target: '0x2::package::commit_upgrade',
    arguments: [tx.object(UPGRADE_CAP_ID), receipt],
  });
  
  // Set gas budget
  tx.setGasBudget(500_000_000);
  
  console.log('📝 Signing and executing upgrade transaction...');
  
  // Sign and execute
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });
  
  console.log('✅ Upgrade transaction executed!');
  console.log('📋 Digest:', result.digest);
  
  if (result.effects?.status?.status === 'success') {
    console.log('🎉 Upgrade successful!');
    
    // Find the new package ID
    const publishedPackage = result.objectChanges?.find(
      (change) => change.type === 'published'
    );
    
    if (publishedPackage && 'packageId' in publishedPackage) {
      console.log('📦 New Package ID:', publishedPackage.packageId);
      return publishedPackage.packageId;
    }
  } else {
    console.error('❌ Upgrade failed:', result.effects?.status);
    throw new Error('Upgrade failed');
  }
}

// Main execution
upgradeContract()
  .then((newPackageId) => {
    console.log('\n🎊 Upgrade Complete!');
    console.log('New Package ID:', newPackageId);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
