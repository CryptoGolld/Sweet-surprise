// @ts-nocheck
/**
 * Test pool creation using official Cetus SDK
 * Following: https://cetus-1.gitbook.io/cetus-developer-docs/developer/via-sdk-v2/sdk-modules/cetusprotocol-sui-clmm-sdk/create-clmm-pool
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import CetusSDK from '@cetusprotocol/cetus-sui-clmm-sdk';
const { CetusClmmSDK, SdkOptions } = CetusSDK;

const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🧪 TESTING CETUS SDK POOL CREATION                         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('Using official Cetus SDK...\n');

async function main() {
  // Initialize Cetus SDK for testnet
  const sdkOptions = {
    fullRpcUrl: 'https://fullnode.testnet.sui.io:443',
    networkType: 'testnet',
  };

  console.log('Initializing Cetus SDK...');
  const sdk = new CetusClmmSDK(sdkOptions);
  sdk.senderAddress = keypair.getPublicKey().toSuiAddress();
  console.log('✅ SDK initialized\n');

  // Coin types
  const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
  const FIX_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';

  console.log('📊 Creating pool for:');
  console.log(`   Coin A: SUILFG_MEMEFI`);
  console.log(`   Coin B: FIX_MEMEFI`);
  console.log(`   Fee: 0.25% (tick spacing 60)\n`);

  try {
    // Create pool using SDK
    const createPoolPayload = await sdk.Pool.createPoolTransactionPayload({
      coinTypeA: SUILFG_TYPE,
      coinTypeB: FIX_TYPE,
      tick_spacing: 60,
      initialize_sqrt_price: '18446744073709551616', // 1:1 price
      uri: '',
    });

    console.log('✅ Pool transaction payload created\n');
    console.log('Payload:', createPoolPayload);

    // Execute
    const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: createPoolPayload,
      options: { showEffects: true, showObjectChanges: true },
    });

    console.log(`\nTX: ${result.digest}`);
    console.log(`Status: ${result.effects?.status?.status}\n`);

    if (result.effects?.status?.status === 'success') {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║  🎉🎉🎉 CETUS SDK WORKS!!! 🎉🎉🎉                           ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');

      console.log('✅ Pool created using Cetus SDK!');
      console.log('✅ This is the solution!\n');

      console.log('Created objects:');
      for (const obj of result.objectChanges || []) {
        if (obj.type === 'created') {
          console.log(`   ${obj.objectType?.split('::').pop()}: ${obj.objectId}`);
        }
      }

      console.log('\n🎯 NOW WE CAN INTEGRATE THIS INTO BONDING CURVE!');

    } else {
      console.log(`❌ Failed: ${result.effects?.status?.error}`);
    }

  } catch (e: any) {
    console.log(`❌ SDK Error: ${e.message}\n`);
    console.log('Full error:', e);
  }
}

main().catch(console.error);
