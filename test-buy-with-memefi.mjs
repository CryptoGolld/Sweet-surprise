/**
 * Test buy with SUILFG_MEMEFI tokens (the correct payment type!)
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { bcs } from '@mysten/sui/bcs';

const PLATFORM_PACKAGE = '0xf19ee4bbe2183adc6bbe44801988e68982839566ddbca3c38321080d420ca7a5';
const PLATFORM_STATE = '0x8df834a79efd8fca907a6d832e93f6301b5d6cf7ff6d16c363829b3267feacff';
const REFERRAL_REGISTRY = '0xef3fa25c0cd5620f20197047c9b8ca9320bbff1625a185b2c8013dbe8fc41814';

const SUILFG_MEMEFI = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::suilfg_memefi::SUILFG_MEMEFI';

const TEST_TOKEN = {
  coinType: '0x6634780991fa96050a02b73989c3a80da07c1705070ce27cfe51dcc6a37a87fe::tomato::TOMATO',
  curveId: '0xfea8044a3b72e4460ac27648c76956e614003f91260bfccc9c0a53cc481caa7d',
};

async function main() {
  console.log('🧪 Testing buy with SUILFG_MEMEFI payment...\n');
  
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
  const mnemonic = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  const sender = keypair.getPublicKey().toSuiAddress();
  
  console.log('Sender:', sender, '\n');
  
  // Get SUILFG_MEMEFI coins (NOT SUI!)
  const coins = await client.getCoins({ owner: sender, coinType: SUILFG_MEMEFI });
  console.log('SUILFG_MEMEFI coins:', coins.data.length);
  
  if (coins.data.length === 0) {
    console.log('❌ No SUILFG_MEMEFI tokens');
    return;
  }
  
  const paymentAmount = 10_000_000_000; // 10 SUILFG_MEMEFI tokens
  const tx = new Transaction();
  
  // Merge SUILFG_MEMEFI coins
  const primaryCoin = tx.object(coins.data[0].coinObjectId);
  if (coins.data.length > 1) {
    tx.mergeCoins(primaryCoin, coins.data.slice(1).map(c => tx.object(c.coinObjectId)));
  }
  
  // Split payment from SUILFG_MEMEFI
  const [paymentCoin] = tx.splitCoins(primaryCoin, [tx.pure.u64(paymentAmount)]);
  
  console.log('Calling buy with SUILFG_MEMEFI payment...');
  
  tx.moveCall({
    target: `${PLATFORM_PACKAGE}::bonding_curve::buy`,
    typeArguments: [TEST_TOKEN.coinType],
    arguments: [
      tx.object(PLATFORM_STATE),
      tx.object(TEST_TOKEN.curveId),
      tx.object(REFERRAL_REGISTRY),
      paymentCoin,  // SUILFG_MEMEFI coin, not SUI!
      tx.pure.u64(paymentAmount),
      tx.pure.u64(1),
      tx.pure.u64(Date.now() + 300000),
      tx.pure(bcs.option(bcs.Address).serialize(null)),
      tx.object('0x6'),
    ],
  });
  
  tx.setSender(sender);
  
  try {
    console.log('Running dry-run...');
    const dryRun = await client.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client }),
    });
    
    console.log('Status:', dryRun.effects.status.status);
    
    if (dryRun.effects.status.status === 'success') {
      console.log('✅✅✅ DRY-RUN SUCCESS! ✅✅✅\n');
      console.log('Executing REAL transaction...\n');
      
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: { showEffects: true, showObjectChanges: true },
      });
      
      console.log('🎉🎉🎉 TRANSACTION EXECUTED SUCCESSFULLY! 🎉🎉🎉\n');
      console.log('Digest:', result.digest);
      console.log('View:', `https://testnet.suivision.xyz/txblock/${result.digest}\n`);
      
      if (result.effects?.status?.status === 'success') {
        console.log('✅ Confirmed on-chain');
      }
    } else {
      console.log('❌ Failed:', dryRun.effects.status.error);
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
}

main().catch(console.error);
