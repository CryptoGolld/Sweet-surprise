/**
 * Upgrade Script: v0.0.8 → v0.0.9
 * 
 * Changes:
 * - Remove AdminCap requirement from prepare_liquidity_for_bot()
 * - Bot only needs to be configured as lp_bot_address (cleaner security model)
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config();

const RPC_URL = 'https://fullnode.testnet.sui.io:443';
const client = new SuiClient({ url: RPC_URL });

// Object IDs (from v0.0.8 deployment)
const UPGRADE_CAP = '0x7ef7bc39eea080ebddb61426c3b81d099690d3d2eab836e80e6e0a70b5cf6c5b';
const CURRENT_PACKAGE = '0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348';

async function main() {
  console.log('🚀 Upgrading Platform: v0.0.8 → v0.0.9\n');

  // Load deployer wallet
  let keypair: Ed25519Keypair;
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    const privKeyArray = Uint8Array.from(Buffer.from(process.env.DEPLOYER_PRIVATE_KEY, 'hex'));
    keypair = Ed25519Keypair.fromSecretKey(privKeyArray);
  } else if (process.env.DEPLOYER_SEED_PHRASE) {
    keypair = Ed25519Keypair.deriveKeypair(process.env.DEPLOYER_SEED_PHRASE);
  } else {
    throw new Error('❌ No DEPLOYER_PRIVATE_KEY or DEPLOYER_SEED_PHRASE in .env');
  }

  const deployerAddress = keypair.toSuiAddress();
  console.log('📍 Deployer Address:', deployerAddress);
  console.log('📦 Current Package:', CURRENT_PACKAGE);
  console.log('🔓 UpgradeCap:', UPGRADE_CAP);

  // Step 1: Build the upgraded contract
  console.log('\n📦 Building upgraded contract...');
  const contractPath = path.join(__dirname, 'suilfg_launch_with_memefi_testnet');
  
  try {
    execSync('sui move build', { 
      cwd: contractPath,
      stdio: 'inherit'
    });
    console.log('✅ Build successful!\n');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }

  // Step 2: Read compiled modules and dependencies
  const buildPath = path.join(contractPath, 'build', 'suilfg_launch_memefi');
  const modulesFile = path.join(buildPath, 'bytecode_modules', 'modules.json');
  const dependenciesFile = path.join(buildPath, 'bytecode_modules', 'dependencies.json');

  if (!fs.existsSync(modulesFile)) {
    throw new Error(`❌ Modules file not found: ${modulesFile}`);
  }

  const modules = JSON.parse(fs.readFileSync(modulesFile, 'utf8'));
  const dependencies = fs.existsSync(dependenciesFile) 
    ? JSON.parse(fs.readFileSync(dependenciesFile, 'utf8'))
    : [];

  console.log(`📚 Compiled ${modules.length} modules`);
  console.log(`📚 Dependencies: ${dependencies.length}\n`);

  // Step 3: Create upgrade transaction
  console.log('🔨 Creating upgrade transaction...');
  const tx = new Transaction();

  const [upgradeTicket] = tx.moveCall({
    target: '0x2::package::authorize_upgrade',
    arguments: [
      tx.object(UPGRADE_CAP),
      tx.pure.u8(0), // UpgradePolicy::Compatible
      tx.pure.vector('u8', [...Buffer.from(modules[0])]), // Digest of first module
    ],
  });

  const [upgradeReceipt] = tx.upgrade({
    modules,
    dependencies,
    package: CURRENT_PACKAGE,
    ticket: upgradeTicket,
  });

  tx.moveCall({
    target: '0x2::package::commit_upgrade',
    arguments: [tx.object(UPGRADE_CAP), upgradeReceipt],
  });

  tx.setGasBudget(500_000_000); // 0.5 SUI

  // Step 4: Execute upgrade
  console.log('⏳ Executing upgrade transaction...\n');
  
  try {
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log('✅ Upgrade successful!');
    console.log('📝 Transaction Digest:', result.digest);
    console.log('🔗 View on explorer:', `https://testnet.suivision.xyz/txblock/${result.digest}\n`);

    // Extract new package ID
    const newPackage = result.objectChanges?.find(
      (change) => change.type === 'published'
    );

    if (newPackage && 'packageId' in newPackage) {
      console.log('🎉 NEW PACKAGE ID:', newPackage.packageId);
      console.log('\n📋 Update these in your .env files:');
      console.log(`PLATFORM_PACKAGE=${newPackage.packageId}`);
    }

    // Show what changed
    console.log('\n📝 Changes in v0.0.9:');
    console.log('  ✅ Removed AdminCap from prepare_liquidity_for_bot()');
    console.log('  ✅ Bot only needs lp_bot_address configuration');
    console.log('  ✅ Simpler, cleaner security model');
    console.log('  ✅ AdminCap no longer needs to be given to bot wallet');

  } catch (error: any) {
    console.error('❌ Upgrade failed:', error);
    if (error.message) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

main().catch(console.error);
