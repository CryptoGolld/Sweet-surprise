// @ts-nocheck
/**
 * Create pool using Cetus SDK - PROPERLY
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { CetusClmmSDK, clmmTestnet } from '@cetusprotocol/cetus-sui-clmm-sdk';

const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🎯 CETUS SDK POOL CREATION (OFFICIAL METHOD)               ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
  // Use built-in testnet config
  const sdkConfig = clmmTestnet();
  
  console.log('Initializing Cetus SDK for testnet...');
  const sdk = new CetusClmmSDK(sdkConfig);
  sdk.senderAddress = keypair.getPublicKey().toSuiAddress();
  
  console.log('✅ SDK initialized\n');
  console.log(`Sender: ${sdk.senderAddress}\n`);
  
  // Coin types
  const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
  const FIX_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';
  
  console.log('📊 Creating pool:');
  console.log(`   Coin A: SUILFG_MEMEFI`);
  console.log(`   Coin B: FIX_MEMEFI`);
  console.log(`   Tick spacing: 60`);
  console.log(`   Initial price: 1:1\n`);
  
  console.log('🚀 Building transaction payload...\n');
  
  try {
    const createPoolPayload = await sdk.Pool.createPoolTransactionPayload({
      coinTypeA: SUILFG_TYPE,
      coinTypeB: FIX_TYPE,
      tick_spacing: 60,
      initialize_sqrt_price: '18446744073709551616',
      uri: '',
    });
    
    console.log('✅ Transaction payload created!\n');
    console.log('Executing on testnet...\n');
    
    const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: createPoolPayload,
      options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });
    
    console.log(`📋 TX: ${result.digest}`);
    console.log(`Status: ${result.effects?.status?.status}\n`);
    
    if (result.effects?.status?.status === 'success') {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║  🎉🎉🎉 SUCCESS!!! POOL CREATED!!! 🎉🎉🎉                   ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
      
      console.log('✅ Cetus SDK works perfectly!\n');
      
      console.log('Created objects:');
      let poolId = null;
      for (const obj of result.objectChanges || []) {
        if (obj.type === 'created') {
          const name = obj.objectType?.split('::').pop() || 'Object';
          console.log(`   ${name}: ${obj.objectId}`);
          
          if (name === 'Pool') {
            poolId = obj.objectId;
          }
        }
      }
      
      if (poolId) {
        console.log(`\n🏊 Pool created: ${poolId}`);
      }
      
      console.log('\n✅ THIS IS THE SOLUTION!');
      console.log('   We can use Cetus SDK from TypeScript!');
      console.log('   Ready to integrate with bonding curve!\n');
      
    } else {
      console.log(`❌ Failed: ${result.effects?.status?.error}\n`);
      
      const error = result.effects?.status?.error || '';
      if (error.includes('0x6')) {
        console.log('💡 Still getting abort 0x6');
        console.log('   Might be pool already exists for this pair');
      }
    }
    
  } catch (e: any) {
    console.log(`❌ Error: ${e.message}\n`);
  }
}

main().catch(console.error);
