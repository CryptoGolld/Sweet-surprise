// @ts-nocheck
/**
 * Test new package with PTB
 */
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const PLATFORM_PKG = '0x9ef4c217bdb7596a1d4a8bee9ec90d0c44eeb597dd3016c547907e3bce43588b';
const PLATFORM_STATE = '0x801ac2a93c64a94bca253f039e8c7cb6ff9579eb45d821d3d8c93cdf168de801';
const COIN_TYPE = '0xbda9d5c77c4e7116ee37cb28c7b3e69b99011c98ac93179a27dbbc65e1f6e73a::testcoin::TESTCOIN';
const TREASURY = '0x409f5f4dfd237a4cf76da5b5104a97a3db95a69ef28f725f9a457ea38fed4626';

console.log('Testing new package with PTB...\n');

async function main() {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::create_new_meme_token`,
    typeArguments: [COIN_TYPE],
    arguments: [
      tx.object(PLATFORM_STATE),
      tx.object(TREASURY),
    ],
  });
  
  tx.setGasBudget(100000000);
  
  console.log('Calling create_new_meme_token...\n');
  
  try {
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });
    
    console.log('✅ SUCCESS!');
    console.log('TX:', result.digest);
    console.log('Status:', result.effects?.status?.status, '\n');
    
    result.objectChanges?.forEach(obj => {
      console.log(`${obj.type}: ${obj.objectType?.split('::').pop()} - ${obj.objectId}`);
    });
    
  } catch (error) {
    console.log('❌ Error:', error.message, '\n');
    console.log('Details:', error.cause?.effects?.status || error.cause);
  }
}

main().catch(console.error);
