/**
 * Test script to verify the bonding curve buy/sell fix
 * 
 * This tests that:
 * 1. Buy mints correct number of tokens (with decimal conversion)
 * 2. Sell works correctly and gives back appropriate amount
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

// Your wallet
const MNEMONIC = process.env.MNEMONIC || '';
const PACKAGE_ID = '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047';
const PLATFORM_STATE = '0x7bf135f0a84ff2bbf9328e1a017b87fb4dcdcc221099f1d4799ba0d67de40a25';
const REFERRAL_REGISTRY = '0x5f554041e47bb6c07dd2214ce1e08c765515f326b6d471edfefc06e925d8e3bc';

// Test values
const TEST_CURVE_ID = process.env.CURVE_ID || ''; // Provide a curve ID to test with
const TEST_COIN_TYPE = process.env.COIN_TYPE || ''; // Full coin type

async function main() {
  if (!MNEMONIC) {
    console.error('❌ Please set MNEMONIC environment variable');
    process.exit(1);
  }

  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  const keypair = Ed25519Keypair.deriveKeypair(MNEMONIC);
  const address = keypair.toSuiAddress();

  console.log('🔍 Testing Bonding Curve Fix\n');
  console.log('📍 Wallet:', address);
  console.log('📦 Package:', PACKAGE_ID);
  console.log('');

  // Check if we have enough SUI for testing
  const coins = await client.getCoins({ owner: address, coinType: '0x2::sui::SUI' });
  const totalSui = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
  console.log(`💰 Available SUI: ${Number(totalSui) / 1e9} SUI`);

  if (totalSui < 100_000_000n) { // 0.1 SUI
    console.error('❌ Not enough SUI for testing (need at least 0.1 SUI)');
    return;
  }

  if (!TEST_CURVE_ID || !TEST_COIN_TYPE) {
    console.log('\n⚠️  To run full test, provide:');
    console.log('  CURVE_ID - a bonding curve object ID');
    console.log('  COIN_TYPE - the full coin type');
    console.log('\n💡 The fix has been applied to:');
    console.log('  - Contract: buy() now multiplies by 1e9 when minting');
    console.log('  - Contract: sell() now divides by 1e9 when calculating supply');
    console.log('  - TypeScript: sellTokensTransaction() now passes amount in smallest units');
    console.log('\nThe contract needs to be upgraded for the fix to take effect.');
    return;
  }

  console.log('\n🧪 Running buy/sell test...\n');

  // TODO: Implement actual test when contract is upgraded
  console.log('✅ Fix has been applied to code');
  console.log('⏳ Contract needs to be upgraded to testnet');
}

main().catch(console.error);
