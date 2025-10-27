/**
 * Test script to buy tokens on LEGACY contract
 * Tests the exact transaction signature
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

// Legacy contract addresses
const LEGACY_PLATFORM_PACKAGE = '0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0';
const LEGACY_PLATFORM_STATE = '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c';
const LEGACY_REFERRAL_REGISTRY = '0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d';

const RPC_URL = 'https://fullnode.testnet.sui.io:443';

// Test with TOMATO token (has existing trades)
const TEST_TOKEN = {
  coinType: '0x6634780991fa96050a02b73989c3a80da07c1705070ce27cfe51dcc6a37a87fe::tomato::TOMATO',
  curveId: '0xfea8044a3b72e4460ac27648c76956e614003f91260bfccc9c0a53cc481caa7d',
};

async function testLegacyBuy() {
  console.log('🧪 Testing LEGACY contract buy transaction...\n');
  
  // Setup
  const client = new SuiClient({ url: RPC_URL });
  
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY environment variable not set');
    console.log('Usage: PRIVATE_KEY=0xYourKey ts-node test-legacy-buy.ts');
    process.exit(1);
  }
  
  const { secretKey } = decodeSuiPrivateKey(process.env.PRIVATE_KEY);
  const keypair = Ed25519Keypair.fromSecretKey(secretKey);
  const sender = keypair.getPublicKey().toSuiAddress();
  
  console.log('👤 Sender:', sender);
  console.log('🪙 Token:', TEST_TOKEN.coinType.split('::').pop());
  console.log('📍 Curve:', TEST_TOKEN.curveId.substring(0, 20) + '...\n');
  
  // Get sender's SUI coins
  const coins = await client.getCoins({
    owner: sender,
    coinType: '0x2::sui::SUI',
  });
  
  if (coins.data.length === 0) {
    console.error('❌ No SUI coins found in wallet');
    process.exit(1);
  }
  
  console.log(`💰 Found ${coins.data.length} SUI coin(s)\n`);
  
  // Build transaction
  const tx = new Transaction();
  
  // Amount to buy: 0.01 SUI worth
  const suiAmount = 10_000_000; // 0.01 SUI in MIST
  const minTokensOut = 1; // Minimum tokens expected
  const deadlineMs = Date.now() + 300000; // 5 minutes
  
  console.log('📦 Building transaction...');
  console.log('   SUI to spend: 0.01 SUI');
  console.log('   Min tokens out: 1');
  console.log('   Deadline: 5 minutes\n');
  
  // Merge all SUI coins
  const primaryCoin = tx.object(coins.data[0].coinObjectId);
  if (coins.data.length > 1) {
    const coinsToMerge = coins.data.slice(1).map(c => tx.object(c.coinObjectId));
    tx.mergeCoins(primaryCoin, coinsToMerge);
  }
  
  // Split payment amount
  const paymentCoin = tx.splitCoins(primaryCoin, [tx.pure.u64(suiAmount)]);
  
  // LEGACY CONTRACT BUY SIGNATURE
  console.log('🔧 Testing argument variations...\n');
  
  // Try Option 1: Using tx.pure.option
  console.log('Option 1: tx.pure.option("address", null)');
  try {
    const tx1 = new Transaction();
    const pc1 = tx1.splitCoins(tx1.object(coins.data[0].coinObjectId), [tx1.pure.u64(suiAmount)]);
    
    tx1.moveCall({
      target: `${LEGACY_PLATFORM_PACKAGE}::bonding_curve::buy`,
      typeArguments: [TEST_TOKEN.coinType],
      arguments: [
        tx1.object(LEGACY_PLATFORM_STATE),
        tx1.object(TEST_TOKEN.curveId),
        tx1.object(LEGACY_REFERRAL_REGISTRY),
        pc1,
        tx1.pure.u64(suiAmount),
        tx1.pure.u64(minTokensOut),
        tx1.pure.u64(deadlineMs),
        tx1.pure.option('address', null),
        tx1.object('0x6'),
      ],
    });
    
    tx1.setSender(sender);
    const dryRun1 = await client.dryRunTransactionBlock({
      transactionBlock: await tx1.build({ client }),
    });
    
    console.log('   Status:', dryRun1.effects.status.status);
    if (dryRun1.effects.status.status === 'success') {
      console.log('   ✅ This option works!\n');
      return { tx: tx1, option: 1 };
    } else {
      console.log('   ❌ Error:', dryRun1.effects.status.error);
    }
  } catch (e: any) {
    console.log('   ❌ Error:', e.message.substring(0, 100));
  }
  console.log('');
  
  // Try Option 2: Using bcs.option with .toBytes()
  console.log('Option 2: bcs.option(bcs.Address).serialize(null)');
  try {
    const { bcs } = await import('@mysten/sui/bcs');
    
    const tx2 = new Transaction();
    const pc2 = tx2.splitCoins(tx2.object(coins.data[0].coinObjectId), [tx2.pure.u64(suiAmount)]);
    
    tx2.moveCall({
      target: `${LEGACY_PLATFORM_PACKAGE}::bonding_curve::buy`,
      typeArguments: [TEST_TOKEN.coinType],
      arguments: [
        tx2.object(LEGACY_PLATFORM_STATE),
        tx2.object(TEST_TOKEN.curveId),
        tx2.object(LEGACY_REFERRAL_REGISTRY),
        pc2,
        tx2.pure.u64(suiAmount),
        tx2.pure.u64(minTokensOut),
        tx2.pure.u64(deadlineMs),
        tx2.pure(bcs.option(bcs.Address).serialize(null)),
        tx2.object('0x6'),
      ],
    });
    
    tx2.setSender(sender);
    const dryRun2 = await client.dryRunTransactionBlock({
      transactionBlock: await tx2.build({ client }),
    });
    
    console.log('   Status:', dryRun2.effects.status.status);
    if (dryRun2.effects.status.status === 'success') {
      console.log('   ✅ This option works!\n');
      return { tx: tx2, option: 2 };
    } else {
      console.log('   ❌ Error:', dryRun2.effects.status.error);
    }
  } catch (e: any) {
    console.log('   ❌ Error:', e.message.substring(0, 100));
  }
  console.log('');
  
  // Try Option 3: Without referrer parameter (old signature?)
  console.log('Option 3: Without referrer parameter');
  try {
    const tx3 = new Transaction();
    const pc3 = tx3.splitCoins(tx3.object(coins.data[0].coinObjectId), [tx3.pure.u64(suiAmount)]);
    
    tx3.moveCall({
      target: `${LEGACY_PLATFORM_PACKAGE}::bonding_curve::buy`,
      typeArguments: [TEST_TOKEN.coinType],
      arguments: [
        tx3.object(LEGACY_PLATFORM_STATE),
        tx3.object(TEST_TOKEN.curveId),
        tx3.object(LEGACY_REFERRAL_REGISTRY),
        pc3,
        tx3.pure.u64(suiAmount),
        tx3.pure.u64(minTokensOut),
        tx3.pure.u64(deadlineMs),
        tx3.object('0x6'),
      ],
    });
    
    tx3.setSender(sender);
    const dryRun3 = await client.dryRunTransactionBlock({
      transactionBlock: await tx3.build({ client }),
    });
    
    console.log('   Status:', dryRun3.effects.status.status);
    if (dryRun3.effects.status.status === 'success') {
      console.log('   ✅ This option works!\n');
      return { tx: tx3, option: 3 };
    } else {
      console.log('   ❌ Error:', dryRun3.effects.status.error);
    }
  } catch (e: any) {
    console.log('   ❌ Error:', e.message.substring(0, 100));
  }
  console.log('');
  
  console.log('❌ None of the options worked. Printing last error details...\n');
  process.exit(1);
}

// Run test
testLegacyBuy()
  .then((result) => {
    if (result) {
      console.log('🎉 SUCCESS!');
      console.log(`✅ Option ${result.option} works for legacy contract buy`);
      console.log('\nTo execute the transaction, add --execute flag');
    }
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  });
