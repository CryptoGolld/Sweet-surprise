// @ts-nocheck
/**
 * Simplest possible Cetus SDK test
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';

const CetusSDK = require('@cetusprotocol/cetus-sui-clmm-sdk');

const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');
const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

console.log('🧪 Cetus SDK Test\n');

console.log('SDK structure:', Object.keys(CetusSDK).slice(0, 10));
console.log('');

async function main() {
  // Check testnet config
  if (CetusSDK.TestnetConfig) {
    console.log('Using TestnetConfig...');
    const config = CetusSDK.TestnetConfig;
    console.log('Config:', config);
    
    const sdk = new CetusSDK.CetusClmmSDK(config);
    sdk.senderAddress = keypair.getPublicKey().toSuiAddress();
    
    console.log('\n✅ SDK initialized');
    console.log(`Sender: ${sdk.senderAddress}\n`);
    
    // Try to create pool
    const SUILFG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
    const FIX = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';
    
    console.log('Creating pool payload...\n');
    
    const payload = await sdk.Pool.createPoolTransactionPayload({
      coinTypeA: SUILFG,
      coinTypeB: FIX,
      tick_spacing: 60,
      initialize_sqrt_price: '18446744073709551616',
      uri: '',
    });
    
    console.log('✅ Payload created!\n');
    console.log('Executing transaction...\n');
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: payload,
      options: { showEffects: true, showObjectChanges: true },
    });
    
    console.log(`TX: ${result.digest}`);
    console.log(`Status: ${result.effects?.status?.status}\n`);
    
    if (result.effects?.status?.status === 'success') {
      console.log('🎉🎉🎉 POOL CREATED WITH CETUS SDK!!! 🎉🎉🎉\n');
      
      for (const obj of result.objectChanges || []) {
        if (obj.type === 'created') {
          console.log(`   ${obj.objectType?.split('::').pop()}: ${obj.objectId}`);
        }
      }
      
    } else {
      console.log(`Failed: ${result.effects?.status?.error}`);
    }
    
  } else {
    console.log('No TestnetConfig found. Available:', Object.keys(CetusSDK));
  }
}

main().catch(console.error);
