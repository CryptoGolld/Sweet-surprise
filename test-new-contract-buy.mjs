/**
 * Test buy on NEW contract (which is what all tokens actually use)
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { bcs } from '@mysten/sui/bcs';

// NEW contract (all current tokens use this!)
const PLATFORM_PACKAGE = '0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5';
const PLATFORM_STATE = '0x8df834a79efd8fca907a6d832e93f6301b5d6cf7ff6d16c363829b3267feacff';
const REFERRAL_REGISTRY = '0xef3fa25c0cd5620f20197047c9b8ca9320bbff1625a185b2c8013dbe8fc41814';

// TOMATO - this uses the NEW contract
const TEST_TOKEN = {
  coinType: '0x6634780991fa96050a02b73989c3a80da07c1705070ce27cfe51dcc6a37a87fe::tomato::TOMATO',
  curveId: '0xfea8044a3b72e4460ac27648c76956e614003f91260bfccc9c0a53cc481caa7d',
};

async function main() {
  console.log('🧪 Testing buy on NEW contract (0xf19ee...)...\n');
  
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
  const mnemonic = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  const sender = keypair.getPublicKey().toSuiAddress();
  
  console.log('Sender:', sender);
  console.log('Token: TOMATO\n');
  
  const coins = await client.getCoins({ owner: sender, coinType: '0x2::sui::SUI' });
  console.log('SUI coins:', coins.data.length, '\n');
  
  if (coins.data.length === 0) {
    console.log('❌ No SUI found');
    return;
  }
  
  const suiAmount = 10_000_000; // 0.01 SUI
  
  // Test 1: tx.pure.vector
  console.log('Test 1: tx.pure.vector("address", [])...');
  const tx = new Transaction();
  
  const primaryCoin = tx.object(coins.data[0].coinObjectId);
  if (coins.data.length > 1) {
    tx.mergeCoins(primaryCoin, coins.data.slice(1).map(c => tx.object(c.coinObjectId)));
  }
  
  const payment = tx.splitCoins(primaryCoin, [tx.pure.u64(suiAmount)]);
  
  tx.moveCall({
    target: `${PLATFORM_PACKAGE}::bonding_curve::buy`,
    typeArguments: [TEST_TOKEN.coinType],
    arguments: [
      tx.object(PLATFORM_STATE),
      tx.object(TEST_TOKEN.curveId),
      tx.object(REFERRAL_REGISTRY),
      payment,
      tx.pure.u64(suiAmount),
      tx.pure.u64(1),
      tx.pure.u64(Date.now() + 300000),
      tx.pure.vector('address', []),
      tx.object('0x6'),
    ],
  });
  
  tx.setSender(sender);
  
  try {
    const dryRun = await client.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client }),
    });
    
    console.log('Status:', dryRun.effects.status.status);
    if (dryRun.effects.status.status === 'success') {
      console.log('✅ SUCCESS! Executing real transaction...\n');
      
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
      });
      
      console.log('🎉 TRANSACTION EXECUTED!');
      console.log('TX:', result.digest);
      console.log('View:', `https://testnet.suivision.xyz/txblock/${result.digest}`);
      return;
    } else {
      console.log('❌ Failed:', dryRun.effects.status.error);
    }
  } catch (e) {
    console.log('❌ Error:', e.message.substring(0, 200));
  }
  
  // Test 2: bcs.option
  console.log('\nTest 2: bcs.option(bcs.Address).serialize(null)...');
  const tx2 = new Transaction();
  
  const pc2 = tx2.object(coins.data[0].coinObjectId);
  if (coins.data.length > 1) {
    tx2.mergeCoins(pc2, coins.data.slice(1).map(c => tx2.object(c.coinObjectId)));
  }
  
  const payment2 = tx2.splitCoins(pc2, [tx2.pure.u64(suiAmount)]);
  
  tx2.moveCall({
    target: `${PLATFORM_PACKAGE}::bonding_curve::buy`,
    typeArguments: [TEST_TOKEN.coinType],
    arguments: [
      tx2.object(PLATFORM_STATE),
      tx2.object(TEST_TOKEN.curveId),
      tx2.object(REFERRAL_REGISTRY),
      payment2,
      tx2.pure.u64(suiAmount),
      tx2.pure.u64(1),
      tx2.pure.u64(Date.now() + 300000),
      tx2.pure(bcs.option(bcs.Address).serialize(null)),
      tx2.object('0x6'),
    ],
  });
  
  tx2.setSender(sender);
  
  try {
    const dryRun2 = await client.dryRunTransactionBlock({
      transactionBlock: await tx2.build({ client }),
    });
    
    console.log('Status:', dryRun2.effects.status.status);
    if (dryRun2.effects.status.status === 'success') {
      console.log('✅ SUCCESS! Executing real transaction...\n');
      
      const result = await client.signAndExecuteTransaction({
        transaction: tx2,
        signer: keypair,
      });
      
      console.log('🎉 TRANSACTION EXECUTED!');
      console.log('TX:', result.digest);
      console.log('View:', `https://testnet.suivision.xyz/txblock/${result.digest}`);
    } else {
      console.log('❌ Failed:', dryRun2.effects.status.error);
    }
  } catch (e) {
    console.log('❌ Error:', e.message.substring(0, 200));
  }
}

main().catch(console.error);
