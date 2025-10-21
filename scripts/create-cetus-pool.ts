// @ts-nocheck
/**
 * Create Cetus pool - with correct testnet addresses
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const PLATFORM_PKG = '0x89e30287cbfd4bb53ea258146cbdac50165478b39020067f1adce731c9f41853';
const PLATFORM_CONFIG = '0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07';

// Cetus Testnet (from platform config)
const CETUS_GLOBAL_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x26579e72429b00a833c1f7b892c059f1b23a89cb0e749c5a2f77a5e72d70c0e5';

const CURVE = '0xfb78d6b706a3e5cff8423422dcd530cd0fcceecfa2fd5b86a3e598e3362e1611';
const COIN_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';

const CLOCK = '0x6';

console.log('🏊 Creating Cetus LP Pool...\n');

async function main() {
  // First, get metadata object IDs from the curve
  const curveObj = await client.getObject({ id: CURVE, options: { showContent: true } });
  const fields: any = curveObj.data?.content?.['fields'];
  
  const coinMetadataId = fields.token_metadata;
  console.log(`✅ FIX_MEMEFI metadata (from curve): ${coinMetadataId}`);
  
  // Get SUILFG metadata from faucet package
  const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
  
  // Query for SUILFG metadata - it's a frozen object from faucet publish
  const suilfgMetadata = await client.getDynamicFields({ parentId: FAUCET_PKG });
  
  // Hardcode known SUILFG metadata (from faucet deployment)
  const SUILFG_METADATA = '0x4e1de62b2e51e9ad621b0eb5e0dd2ca3fc62c301ddb3cbc7fe9a34be54e67e98'; // will try to find
  
  console.log(`\n📊 Pool Parameters:`);
  console.log(`   Coin A: SUILFG_MEMEFI`);
  console.log(`   Coin B: FIX_MEMEFI`);
  console.log(`   Tick Spacing: 60`);
  console.log(`   Initial Price: ~1:1\n`);
  
  const SQRT_PRICE_1_TO_1 = '18446744073709551616';
  
  const tx = new Transaction();
  
  // Try without metadata first - pool_creator might not need it
  try {
    tx.moveCall({
      target: `${PLATFORM_PKG}::bonding_curve::seed_pool_and_create_cetus_with_lock`,
      typeArguments: [COIN_TYPE],
      arguments: [
        tx.object(PLATFORM_CONFIG),
        tx.object(CURVE),
        tx.object(CETUS_GLOBAL_CONFIG),
        tx.object(CETUS_POOLS),
        tx.pure.u32(60),
        tx.pure.u128(SQRT_PRICE_1_TO_1),
        tx.object('0x0000000000000000000000000000000000000000000000000000000000000000'), // dummy for now
        tx.object(coinMetadataId),
        tx.object(CLOCK),
      ],
    });
  } catch (e: any) {
    console.log('Need to find SUILFG metadata properly...');
    
    // Query faucet package objects
    const faucetObjs = await client.getObject({
      id: FAUCET_PKG,
      options: { showPreviousTransaction: true },
    });
    
    console.log('Faucet package:', faucetObjs);
  }
  
  tx.setGasBudget(500_000_000);
  
  console.log('🚀 Creating pool...\n');
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true },
  });
  
  console.log(`📋 TX: ${result.digest}`);
  console.log(`Status: ${result.effects?.status?.status}\n`);
  
  if (result.effects?.status?.status === 'success') {
    console.log('✅ POOL CREATED!\n');
    
    for (const obj of result.objectChanges || []) {
      if (obj.type === 'created') {
        console.log(`   ${obj.objectType?.split('::').pop()}: ${obj.objectId}`);
      }
    }
  } else {
    console.log('❌ Failed:', result.effects?.status?.error);
  }
}

main().catch(console.error);
