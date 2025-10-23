// @ts-nocheck
/**
 * Using initCetusSDK from the README
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';

const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');
const wallet = keypair.getPublicKey().toSuiAddress();

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🎯 CETUS SDK - PROPER INITIALIZATION                       ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
  console.log('Initializing Cetus SDK for testnet...\n');
  
  const cetusClmmSDK = initCetusSDK({
    network: 'testnet',
    wallet: wallet,
  });
  
  console.log('✅ SDK initialized!\n');
  console.log(`Wallet: ${wallet}\n`);
  
  // Coin types
  const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
  const FIX_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';
  
  console.log('📊 Creating pool for:');
  console.log(`   Coin A: SUILFG_MEMEFI`);
  console.log(`   Coin B: FIX_MEMEFI`);
  console.log(`   Tick spacing: 60 (0.25% fee)\n`);
  
  console.log('🚀 Building create pool transaction...\n');
  
  try {
    const createPoolPayload = await cetusClmmSDK.Pool.createPoolTransactionPayload({
      coinTypeA: SUILFG_TYPE,
      coinTypeB: FIX_TYPE,
      tick_spacing: 60,
      initialize_sqrt_price: '18446744073709551616',
      uri: '',
    });
    
    console.log('✅ Transaction payload created!\n');
    console.log('Executing transaction...\n');
    
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
      console.log('║  🎉🎉🎉 IT WORKS!!! POOL CREATED!!! 🎉🎉🎉                  ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
      
      console.log('✅ Cetus SDK works perfectly!\n');
      
      console.log('📦 Created objects:');
      let poolId = null;
      for (const obj of result.objectChanges || []) {
        if (obj.type === 'created') {
          const name = obj.objectType?.split('::').pop() || 'Object';
          console.log(`   ${name}: ${obj.objectId}`);
          
          if (name === 'Pool' || obj.objectType?.includes('::pool::Pool')) {
            poolId = obj.objectId;
          }
        }
      }
      
      if (poolId) {
        console.log(`\n🏊 Pool ID: ${poolId}`);
        console.log(`   https://testnet.cetus.zone/pool/${poolId}\n`);
      }
      
      console.log('Events emitted:');
      for (const evt of result.events || []) {
        const eventType = evt.type.split('::').pop();
        console.log(`   ✅ ${eventType}`);
      }
      
      console.log('\n╔══════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ SOLUTION FOUND!                                          ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
      
      console.log('We can now:');
      console.log('1. Use Cetus SDK from TypeScript ✅');
      console.log('2. Create pools after bonding curve graduation ✅');
      console.log('3. Fully automate the process ✅\n');
      
      console.log('Ready to integrate with bonding curve! 🚀');
      
    } else {
      console.log(`❌ Transaction failed!`);
      console.log(`Error: ${result.effects?.status?.error}\n`);
      
      const error = result.effects?.status?.error || '';
      if (error.includes('0x6')) {
        console.log('Still getting error 0x6 from Cetus factory');
        console.log('This might mean pool already exists for SUILFG/FIX');
      }
    }
    
  } catch (e: any) {
    console.log(`❌ SDK Error: ${e.message}\n`);
    console.log('This might mean:');
    console.log('   - Pool already exists');
    console.log('   - SDK configuration issue');
    console.log('   - Network connectivity problem\n');
  }
}

main().catch(console.error);
