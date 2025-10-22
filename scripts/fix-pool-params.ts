// @ts-nocheck
/**
 * The coin type resolved! Now fix the pool parameters
 * Abort 0x6 is likely tick spacing or fee tier issue
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const PLATFORM_PKG = '0x89e30287cbfd4bb53ea258146cbdac50165478b39020067f1adce731c9f41853';
const PLATFORM_CONFIG = '0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07';

const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2';

const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';
const CLOCK = '0x6';

// From our working test
const COIN_TYPE = '0x9c3a8d56488c7cdae0ab7f245415bce7e28c629efb8e8db2a98e32780f74061c::working_memefi::WORKING_MEMEFI';
const CURVE_ID = '0xb7bb734de1c50cf4ca9e627115d7e39c98d3b9d1613dbb319acb011646e1a923';
const COIN_METADATA = '0x38aa5514a58b14cb4862955ee9cb580ed2f7cf608c94da8e657b6df2732af895';

console.log('🔧 FIXING POOL PARAMETERS\n');
console.log('Coin types resolved! Now trying different tick spacings...\n');

async function tryTickSpacing(spacing: number) {
  console.log(`Trying tick spacing: ${spacing}`);
  
  const tx = new Transaction();
  tx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::seed_pool_and_create_cetus_with_lock`,
    typeArguments: [COIN_TYPE],
    arguments: [
      tx.object(PLATFORM_CONFIG),
      tx.object(CURVE_ID),
      tx.object(CETUS_CONFIG),
      tx.object(CETUS_POOLS),
      tx.pure.u32(spacing),
      tx.pure.u128('18446744073709551616'),
      tx.object(SUILFG_METADATA),
      tx.object(COIN_METADATA),
      tx.object(CLOCK),
    ],
  });
  tx.setGasBudget(500_000_000);
  
  try {
    const res = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true, showObjectChanges: true },
    });
    
    if (res.effects?.status?.status === 'success') {
      console.log(`✅ SUCCESS with spacing ${spacing}!`);
      console.log(`TX: ${res.digest}\n`);
      
      for (const obj of res.objectChanges || []) {
        if (obj.type === 'created') {
          console.log(`   ${obj.objectType?.split('::').pop()}: ${obj.objectId}`);
        }
      }
      
      return true;
    } else {
      const err = res.effects?.status?.error || '';
      console.log(`❌ Failed: ${err.slice(0, 100)}...\n`);
      return false;
    }
  } catch (e: any) {
    console.log(`❌ Error: ${e.message.slice(0, 100)}...\n`);
    return false;
  }
}

async function main() {
  // Cetus commonly supports these tick spacings
  const spacings = [1, 2, 10, 60, 200];
  
  console.log('Testing different tick spacings to find which one works...\n');
  
  for (const spacing of spacings) {
    const success = await tryTickSpacing(spacing);
    if (success) {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 POOL CREATED SUCCESSFULLY! 🎉                           ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
      console.log(`Working tick spacing: ${spacing}`);
      console.log(`Pools address: ${CETUS_POOLS}\n`);
      console.log('✅ Everything works now!');
      break;
    }
    
    await new Promise(r => setTimeout(r, 3000));
  }
}

main().catch(console.error);
