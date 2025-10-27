/**
 * Execute a REAL buy transaction on legacy contract
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Legacy contract addresses  
const LEGACY_PLATFORM_PACKAGE = '0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0';
const LEGACY_PLATFORM_STATE = '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c';
const LEGACY_REFERRAL_REGISTRY = '0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d';

const RPC_URL = 'https://fullnode.testnet.sui.io:443';

// TOMATO token (has existing curve)
const TEST_TOKEN = {
  coinType: '0x6634780991fa96050a02b73989c3a80da07c1705070ce27cfe51dcc6a37a87fe::tomato::TOMATO',
  curveId: '0xfea8044a3b72e4460ac27648c76956e614003f91260bfccc9c0a53cc481caa7d',
};

async function testBuyTransaction() {
  console.log('🧪 Testing REAL buy transaction on legacy contract...\n');
  
  const client = new SuiClient({ url: RPC_URL });
  
  // Import wallet from mnemonic
  const mnemonic = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  const sender = keypair.getPublicKey().toSuiAddress();
  
  console.log('👤 Sender:', sender);
  console.log('🪙 Token: TOMATO');
  console.log('📍 Curve:', TEST_TOKEN.curveId.substring(0, 20) + '...\n');
  
  // Get SUI coins
  const coins = await client.getCoins({
    owner: sender,
    coinType: '0x2::sui::SUI',
  });
  
  if (coins.data.length === 0) {
    console.error('❌ No SUI coins found');
    process.exit(1);
  }
  
  const totalBalance = coins.data.reduce((sum: bigint, c: any) => sum + BigInt(c.balance), 0n);
  console.log(`💰 SUI Balance: ${Number(totalBalance) / 1e9} SUI\n`);
  
  // Build transaction - buying 0.01 SUI worth
  const suiAmount = 10_000_000; // 0.01 SUI
  const minTokensOut = 1;
  const deadlineMs = Date.now() + 300000;
  
  const tx = new Transaction();
  
  // Merge coins
  const primaryCoin = tx.object(coins.data[0].coinObjectId);
  if (coins.data.length > 1) {
    tx.mergeCoins(primaryCoin, coins.data.slice(1).map((c: any) => tx.object(c.coinObjectId)));
  }
  
  // Split payment
  const paymentCoin = tx.splitCoins(primaryCoin, [tx.pure.u64(suiAmount)]);
  
  console.log('🔧 Testing with tx.pure.vector("address", [])...\n');
  
  tx.moveCall({
    target: `${LEGACY_PLATFORM_PACKAGE}::bonding_curve::buy`,
    typeArguments: [TEST_TOKEN.coinType],
    arguments: [
      tx.object(LEGACY_PLATFORM_STATE),
      tx.object(TEST_TOKEN.curveId),
      tx.object(LEGACY_REFERRAL_REGISTRY),
      paymentCoin,
      tx.pure.u64(suiAmount),
      tx.pure.u64(minTokensOut),
      tx.pure.u64(deadlineMs),
      tx.pure.vector('address', []), // This is what we think works
      tx.object('0x6'),
    ],
  });
  
  // Dry run first
  console.log('📋 Running dry-run...');
  tx.setSender(sender);
  
  try {
    const dryRun = await client.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client }),
    });
    
    console.log('   Status:', dryRun.effects.status.status);
    
    if (dryRun.effects.status.status === 'success') {
      console.log('   ✅ Dry-run succeeded!\n');
      
      // Execute the transaction
      console.log('🚀 Executing transaction...');
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      
      console.log('\n🎉 SUCCESS!');
      console.log('📝 Transaction:', result.digest);
      console.log('🔍 View at: https://testnet.suivision.xyz/txblock/' + result.digest);
      
      return result;
    } else {
      console.log('   ❌ Dry-run failed!');
      console.log('   Error:', dryRun.effects.status.error);
      
      // Try alternative format
      console.log('\n🔧 Trying alternative: bcs.option(bcs.Address).serialize(null)...\n');
      
      const { bcs } = await import('@mysten/sui/bcs');
      const tx2 = new Transaction();
      
      const pc2 = tx2.object(coins.data[0].coinObjectId);
      if (coins.data.length > 1) {
        tx2.mergeCoins(pc2, coins.data.slice(1).map((c: any) => tx2.object(c.coinObjectId)));
      }
      const payment2 = tx2.splitCoins(pc2, [tx2.pure.u64(suiAmount)]);
      
      tx2.moveCall({
        target: `${LEGACY_PLATFORM_PACKAGE}::bonding_curve::buy`,
        typeArguments: [TEST_TOKEN.coinType],
        arguments: [
          tx2.object(LEGACY_PLATFORM_STATE),
          tx2.object(TEST_TOKEN.curveId),
          tx2.object(LEGACY_REFERRAL_REGISTRY),
          payment2,
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
        console.log('   ✅ This format works!\n');
        
        console.log('🚀 Executing with bcs.option format...');
        const result = await client.signAndExecuteTransaction({
          transaction: tx2,
          signer: keypair,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        });
        
        console.log('\n🎉 SUCCESS!');
        console.log('📝 Transaction:', result.digest);
        console.log('🔍 View at: https://testnet.suivision.xyz/txblock/' + result.digest);
        
        return result;
      } else {
        console.log('   ❌ Also failed:', dryRun2.effects.status.error);
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

testBuyTransaction()
  .then(() => console.log('\n✅ Test complete!'))
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
