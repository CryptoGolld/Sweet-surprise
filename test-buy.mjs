/**
 * Test buy transaction on legacy contract
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { bcs } from '@mysten/sui/bcs';

const LEGACY_PLATFORM_PACKAGE = '0x98da9f73a80663ec6d8cf0f9d9e1edd030d9255b780f755e6a85ae468545fdd0';
const LEGACY_PLATFORM_STATE = '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c';
const LEGACY_REFERRAL_REGISTRY = '0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d';

const TEST_TOKEN = {
  coinType: '0x6634780991fa96050a02b73989c3a80da07c1705070ce27cfe51dcc6a37a87fe::tomato::TOMATO',
  curveId: '0xfea8044a3b72e4460ac27648c76956e614003f91260bfccc9c0a53cc481caa7d',
};

async function main() {
  console.log('🧪 Testing buy on legacy contract...\n');
  
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
  const mnemonic = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  const sender = keypair.getPublicKey().toSuiAddress();
  
  console.log('Sender:', sender, '\n');
  
  const coins = await client.getCoins({ owner: sender, coinType: '0x2::sui::SUI' });
  console.log('SUI coins:', coins.data.length, '\n');
  
  const suiAmount = 10_000_000;
  const tx = new Transaction();
  
  const primaryCoin = tx.object(coins.data[0].coinObjectId);
  if (coins.data.length > 1) {
    tx.mergeCoins(primaryCoin, coins.data.slice(1).map(c => tx.object(c.coinObjectId)));
  }
  
  const payment = tx.splitCoins(primaryCoin, [tx.pure.u64(suiAmount)]);
  
  console.log('Testing tx.pure.vector("address", [])...');
  
  tx.moveCall({
    target: `${LEGACY_PLATFORM_PACKAGE}::bonding_curve::buy`,
    typeArguments: [TEST_TOKEN.coinType],
    arguments: [
      tx.object(LEGACY_PLATFORM_STATE),
      tx.object(TEST_TOKEN.curveId),
      tx.object(LEGACY_REFERRAL_REGISTRY),
      payment,
      tx.pure.u64(suiAmount),
      tx.pure.u64(1),
      tx.pure.u64(Date.now() + 300000),
      tx.pure.vector('address', []),
      tx.object('0x6'),
    ],
  });
  
  tx.setSender(sender);
  const dryRun = await client.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client }),
  });
  
  console.log('Status:', dryRun.effects.status.status);
  if (dryRun.effects.status.error) {
    console.log('Error:', JSON.stringify(dryRun.effects.status.error, null, 2), '\n');
  }
  
  if (dryRun.effects.status.status === 'success') {
    console.log('✅ tx.pure.vector works! Executing...\n');
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
    });
    console.log('TX:', result.digest);
    console.log('View:', `https://testnet.suivision.xyz/txblock/${result.digest}`);
    return;
  }
  
  // Try bcs.option
  console.log('\nTrying bcs.option(bcs.Address).serialize(null)...');
  const tx2 = new Transaction();
  const pc2 = tx2.object(coins.data[0].coinObjectId);
  if (coins.data.length > 1) {
    tx2.mergeCoins(pc2, coins.data.slice(1).map(c => tx2.object(c.coinObjectId)));
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
      tx2.pure.u64(1),
      tx2.pure.u64(Date.now() + 300000),
      tx2.pure(bcs.option(bcs.Address).serialize(null)),
      tx2.object('0x6'),
    ],
  });
  
  tx2.setSender(sender);
  const dryRun2 = await client.dryRunTransactionBlock({
    transactionBlock: await tx2.build({ client }),
  });
  
  console.log('Status:', dryRun2.effects.status.status);
  if (dryRun2.effects.status.error) {
    console.log('Error:', JSON.stringify(dryRun2.effects.status.error, null, 2));
  }
  
  if (dryRun2.effects.status.status === 'success') {
    console.log('✅ bcs.option works! Executing...\n');
    const result = await client.signAndExecuteTransaction({
      transaction: tx2,
      signer: keypair,
    });
    console.log('TX:', result.digest);
    console.log('View:', `https://testnet.suivision.xyz/txblock/${result.digest}`);
  }
}

main().catch(console.error);
