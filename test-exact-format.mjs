/**
 * Replicate EXACT format from successful on-chain transaction
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const PLATFORM_PACKAGE = '0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5';
const PLATFORM_STATE = '0x8df834a79efd8fca907a6d832e93f6301b5d6cf7ff6d16c363829b3267feacff';
const REFERRAL_REGISTRY = '0xef3fa25c0cd5620f20197047c9b8ca9320bbff1625a185b2c8013dbe8fc41814';

const TEST_TOKEN = {
  coinType: '0x6634780991fa96050a02b73989c3a80da07c1705070ce27cfe51dcc6a37a87fe::tomato::TOMATO',
  curveId: '0xfea8044a3b72e4460ac27648c76956e614003f91260bfccc9c0a53cc481caa7d',
};

async function main() {
  console.log('🧪 Exact replication of working transaction format...\n');
  
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
  const mnemonic = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  const sender = keypair.getPublicKey().toSuiAddress();
  
  console.log('Sender:', sender, '\n');
  
  const coins = await client.getCoins({ owner: sender, coinType: '0x2::sui::SUI' });
  if (coins.data.length === 0) {
    console.log('❌ No SUI');
    return;
  }
  
  const suiAmount = 10_000_000;
  const tx = new Transaction();
  
  // Step 1: Merge all coins (exactly like working TX)
  const primaryCoin = tx.object(coins.data[0].coinObjectId);
  if (coins.data.length > 1) {
    tx.mergeCoins(primaryCoin, coins.data.slice(1).map(c => tx.object(c.coinObjectId)));
  }
  
  // Step 2: Split the payment amount
  const [paymentCoin] = tx.splitCoins(primaryCoin, [tx.pure.u64(suiAmount)]);
  
  // Step 3: Call buy with exact working format
  tx.moveCall({
    target: `${PLATFORM_PACKAGE}::bonding_curve::buy`,
    typeArguments: [TEST_TOKEN.coinType],
    arguments: [
      tx.object(PLATFORM_STATE),           // cfg
      tx.object(TEST_TOKEN.curveId),        // curve
      tx.object(REFERRAL_REGISTRY),         // referral_registry
      paymentCoin,                           // payment (from splitCoins result)
      tx.pure.u64(suiAmount),               // max_sui_in
      tx.pure.u64(1),                        // min_tokens_out
      tx.pure.u64(Date.now() + 300000),     // deadline
      tx.pure.vector('address', []),        // referrer: Option<address>
      tx.object('0x6'),                      // clock
    ],
  });
  
  tx.setSender(sender);
  
  console.log('Running dry-run...');
  try {
    const dryRun = await client.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client }),
    });
    
    console.log('Status:', dryRun.effects.status.status);
    
    if (dryRun.effects.status.status === 'success') {
      console.log('✅ DRY-RUN SUCCESS!\n');
      console.log('Executing REAL transaction...');
      
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      
      console.log('\n🎉🎉🎉 TRANSACTION SUCCESSFUL! 🎉🎉🎉\n');
      console.log('Digest:', result.digest);
      console.log('View at: https://testnet.suivision.xyz/txblock/' + result.digest);
      
      // Show what happened
      if (result.effects?.status?.status === 'success') {
        console.log('\n✅ Transaction executed successfully on-chain');
      }
    } else {
      console.log('❌ Dry-run failed:', dryRun.effects.status.error);
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
    if (e.cause) {
      console.log('Details:', JSON.stringify(e.cause.effects?.status, null, 2));
    }
  }
}

main().catch(console.error);
