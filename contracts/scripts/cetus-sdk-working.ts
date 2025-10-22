// @ts-nocheck
/**
 * Proper Cetus SDK initialization for testnet
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import SDK from '@cetusprotocol/cetus-sui-clmm-sdk';

const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

console.log('🧪 CETUS SDK Pool Creation Test\n');

async function main() {
  // Testnet configuration
  const sdkEnv = SDK.testnet();  // Use built-in testnet config
  
  const sdk = new SDK.CetusClmmSDK(sdkEnv);
  sdk.senderAddress = keypair.getPublicKey().toSuiAddress();
  
  console.log('✅ SDK initialized with testnet config\n');
  
  console.log('SDK Config:');
  console.log(`   Network: testnet`);
  console.log(`   Sender: ${sdk.senderAddress}\n`);
  
  // Coin types
  const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
  const FIX_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';
  
  console.log('📊 Creating pool:');
  console.log(`   Pair: SUILFG / FIX`);
  console.log(`   Tick spacing: 60 (0.25% fee)\n`);
  
  try {
    const createPoolPayload = await sdk.Pool.createPoolTransactionPayload({
      coinTypeA: SUILFG_TYPE,
      coinTypeB: FIX_TYPE,
      tick_spacing: 60,
      initialize_sqrt_price: '18446744073709551616',
      uri: '',
    });
    
    console.log('✅ Transaction payload created!\n');
    
    // Execute transaction
    const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: createPoolPayload,
      options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });
    
    console.log(`TX: ${result.digest}`);
    console.log(`Status: ${result.effects?.status?.status}\n`);
    
    if (result.effects?.status?.status === 'success') {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║  🎉🎉🎉 IT WORKS!!! CETUS SDK WORKS!!! 🎉🎉🎉              ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
      
      console.log('✅ Pool created successfully using Cetus SDK!\n');
      
      console.log('Created objects:');
      for (const obj of result.objectChanges || []) {
        if (obj.type === 'created') {
          const name = obj.objectType?.split('::').pop() || 'Object';
          console.log(`   ${name}: ${obj.objectId}`);
        }
      }
      
      console.log('\nEvents:');
      for (const evt of result.events || []) {
        console.log(`   ${evt.type.split('::').pop()}`);
      }
      
      console.log('\n🎯 THIS IS THE SOLUTION!');
      console.log('   Cetus SDK handles everything correctly!');
      console.log('   Ready to integrate with bonding curve!');
      
    } else {
      console.log(`❌ Failed: ${result.effects?.status?.error}`);
    }
    
  } catch (e: any) {
    console.log(`❌ Error: ${e.message}\n`);
    if (e.stack) {
      console.log('Stack:', e.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

main().catch(console.error);
