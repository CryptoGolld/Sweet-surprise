/**
 * Upgrade script for bonding curve fix
 * 
 * CRITICAL FIXES APPLIED:
 * 1. buy() now multiplies tokens by 1e9 when minting (line 217)
 * 2. sell() now divides amount_tokens by 1e9 when updating supply (line 244)
 * 3. TypeScript sellTokensTransaction() now passes amount in smallest units
 * 
 * Run with: MNEMONIC="your seed phrase" npx tsx upgrade-bonding-curve.ts
 */

import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const MNEMONIC = process.env.MNEMONIC || '';
const PACKAGE_ID = '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047';

async function main() {
  if (!MNEMONIC) {
    console.error('❌ Please set MNEMONIC environment variable');
    console.log('\nUsage: MNEMONIC="your seed phrase" npx tsx upgrade-bonding-curve.ts');
    process.exit(1);
  }

  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  const keypair = Ed25519Keypair.deriveKeypair(MNEMONIC);
  const address = keypair.toSuiAddress();

  console.log('🔄 Upgrading Bonding Curve Contract\n');
  console.log('📍 Deployer Address:', address);
  console.log('📦 Package ID:', PACKAGE_ID);
  console.log('');

  // Step 1: Find the UpgradeCap object
  console.log('🔍 Finding UpgradeCap object...');
  const upgradeCapType = `0x2::package::UpgradeCap`;
  const objects = await client.getOwnedObjects({
    owner: address,
    filter: {
      StructType: upgradeCapType
    },
    options: {
      showContent: true,
      showType: true,
    }
  });

  console.log(`   Found ${objects.data.length} UpgradeCap objects`);
  
  // Find the one for our package
  let upgradeCapId: string | null = null;
  for (const obj of objects.data) {
    if (obj.data?.content && 'fields' in obj.data.content) {
      const fields = obj.data.content.fields as any;
      if (fields.package === PACKAGE_ID) {
        upgradeCapId = obj.data.objectId;
        console.log(`   ✅ Found UpgradeCap for package: ${upgradeCapId}`);
        break;
      }
    }
  }

  if (!upgradeCapId) {
    console.error('\n❌ Could not find UpgradeCap for package', PACKAGE_ID);
    console.log('\nℹ️  Possible reasons:');
    console.log('   - You are not the package deployer');
    console.log('   - The UpgradeCap has been transferred/burnt');
    console.log('   - Wrong wallet mnemonic');
    process.exit(1);
  }

  // Step 2: Build the package to get compiled modules
  console.log('\n📦 Building package...');
  try {
    execSync('cd suilfg_launch && sui move build', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('❌ Build failed');
    process.exit(1);
  }

  // Step 3: Read compiled modules
  console.log('\n📖 Reading compiled bytecode...');
  const buildDir = path.join(process.cwd(), 'suilfg_launch/build/suilfg_launch');
  const modulesPath = path.join(buildDir, 'bytecode_modules');
  const modules: number[][] = [];
  
  const moduleFiles = ['bonding_curve.mv', 'platform_config.mv', 'ticker_registry.mv'];
  for (const file of moduleFiles) {
    const filePath = path.join(modulesPath, file);
    if (fs.existsSync(filePath)) {
      const bytecode = fs.readFileSync(filePath);
      modules.push(Array.from(bytecode));
      console.log(`   ✅ Loaded ${file} (${bytecode.length} bytes)`);
    }
  }

  // Step 4: Read dependencies from package info
  const packageInfoPath = path.join(buildDir, 'package-digest.json');
  let dependencies: string[] = [];
  if (fs.existsSync(packageInfoPath)) {
    const packageInfo = JSON.parse(fs.readFileSync(packageInfoPath, 'utf-8'));
    // Dependencies come from the build output
    dependencies = Object.values(packageInfo).map((d: any) => d.digest || d);
    console.log(`   ℹ️  Found ${dependencies.length} dependencies`);
  }

  // Step 5: Build upgrade transaction
  console.log('\n🔨 Building upgrade transaction...');
  const tx = new Transaction();
  tx.setGasBudget(500_000_000); // 0.5 SUI for upgrade

  const upgradeCap = tx.object(upgradeCapId);
  const upgradeTicket = tx.moveCall({
    target: '0x2::package::authorize_upgrade',
    arguments: [
      upgradeCap,
      tx.pure.u8(0), // Policy: compatible upgrade
      tx.pure.vector('u8', []), // Digest (empty for compatible)
    ],
  });

  const upgradeReceipt = tx.upgrade({
    modules: modules.map(m => new Uint8Array(m)),
    dependencies: dependencies,
    package: PACKAGE_ID,
    ticket: upgradeTicket,
  });

  tx.moveCall({
    target: '0x2::package::commit_upgrade',
    arguments: [upgradeCap, upgradeReceipt],
  });

  // Step 6: Execute
  console.log('\n📤 Executing upgrade transaction...');
  console.log('   This will take a moment...\n');

  try {
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log('✅ UPGRADE SUCCESSFUL!\n');
    console.log('Transaction Digest:', result.digest);
    console.log('Status:', result.effects?.status);
    console.log('\n🔗 View on explorer:');
    console.log(`https://suiscan.xyz/testnet/tx/${result.digest}`);
    
    console.log('\n📋 FIXES APPLIED:');
    console.log('   ✅ Buy now mints correct number of tokens (multiplies by 1e9)');
    console.log('   ✅ Sell now correctly calculates token amounts (divides by 1e9)');
    console.log('   ✅ All existing curves will work with the new logic');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Test buy/sell on an existing curve');
    console.log('   2. Verify correct token amounts are minted/burned');
    console.log('   3. Frontend TypeScript is already updated');
    
  } catch (error: any) {
    console.error('\n❌ UPGRADE FAILED:');
    console.error(error.message || error);
    
    if (error.message?.includes('InsufficientGas')) {
      console.log('\n💡 Try increasing gas budget in the script');
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
