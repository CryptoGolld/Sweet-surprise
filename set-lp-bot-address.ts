import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Set LP Bot Address for v0.0.8 Contract
 * 
 * This script configures the LP bot address that will receive LP tokens
 * for pool creation after bonding curve graduation.
 */

const PACKAGE_ID = '0xa49978cdb7a2a6eacc974c830da8459089bc446248daed05e0fe6ef31e2f4348';
const ADMIN_CAP = '0x7687bb4d6149db3c87ec3b96bbe3d4b59dbd9ed7f0a6de6a447422559332ca11';
const PLATFORM_CONFIG = '0x3db44f01f62024e124dee24dd6185ce702e2babe24c3fb331507080d13f873f9';
const LP_BOT_ADDRESS = '0x86b38b6c9406cb88ec4043d47c97df93152b75cbb6ade7c1fe0f63af5c42ff9f';

async function setLpBotAddress() {
  console.log('🔧 Setting LP Bot Address for v0.0.8 Contract\n');
  console.log('📦 Package:', PACKAGE_ID);
  console.log('🔐 AdminCap:', ADMIN_CAP);
  console.log('⚙️  PlatformConfig:', PLATFORM_CONFIG);
  console.log('🤖 LP Bot Address:', LP_BOT_ADDRESS);
  console.log('');

  // Initialize Sui client
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });

  // Get credentials from environment variable
  const privateKey = process.env.ADMIN_PRIVATE_KEY;
  const seedPhrase = process.env.ADMIN_SEED_PHRASE;
  
  if (!privateKey && !seedPhrase) {
    throw new Error('Either ADMIN_PRIVATE_KEY or ADMIN_SEED_PHRASE environment variable must be set');
  }

  // Create keypair from seed phrase or private key
  let keypair: Ed25519Keypair;
  
  try {
    if (seedPhrase) {
      console.log('Using seed phrase...');
      keypair = Ed25519Keypair.deriveKeypair(seedPhrase);
    } else {
      console.log('Using private key...');
      // Handle both formats: with or without 'suiprivkey' prefix
      const keyHex = privateKey.replace(/^suiprivkey/, '');
      keypair = Ed25519Keypair.fromSecretKey(fromHEX(keyHex));
    }
  } catch (error) {
    throw new Error('Invalid credentials format. Expected seed phrase (12 words) or suiprivkey... format');
  }

  const activeAddress = keypair.getPublicKey().toSuiAddress();
  console.log('👤 Signer Address:', activeAddress);
  console.log('');

  // Create transaction
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::platform_config::set_lp_bot_address`,
    arguments: [
      tx.object(ADMIN_CAP),
      tx.object(PLATFORM_CONFIG),
      tx.pure.address(LP_BOT_ADDRESS),
    ],
  });

  // Set gas budget
  tx.setGasBudget(10_000_000);

  console.log('🔄 Executing transaction...\n');

  try {
    // Execute transaction
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    console.log('✅ Transaction successful!');
    console.log('📝 Digest:', result.digest);
    console.log('🔗 Explorer:', `https://testnet.suivision.xyz/txblock/${result.digest}`);
    console.log('');

    // Verify the change
    console.log('🔍 Verifying LP bot address...');
    const configObject = await client.getObject({
      id: PLATFORM_CONFIG,
      options: { showContent: true },
    });

    if (configObject.data?.content?.dataType === 'moveObject') {
      const fields = configObject.data.content.fields as any;
      const lpBotAddress = fields.lp_bot_address;
      
      console.log('✅ Current LP bot address:', lpBotAddress);
      
      if (lpBotAddress === LP_BOT_ADDRESS) {
        console.log('🎉 LP bot address successfully updated!');
      } else {
        console.log('⚠️  LP bot address does not match expected value');
      }
    }

  } catch (error: any) {
    console.error('❌ Transaction failed:', error.message);
    throw error;
  }
}

// Run the script
setLpBotAddress()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
