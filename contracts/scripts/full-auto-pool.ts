// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const PLATFORM_PKG = '0x89e30287cbfd4bb53ea258146cbdac50165478b39020067f1adce731c9f41853';
const PLATFORM_CONFIG = '0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07';
const TICKER_REGISTRY = '0xe0cb6b5e4396ae9e8444d123f36d086cbb6e6b3b5c808cca968a942f5b475a32';
const REFERRAL_REGISTRY = '0x5b1b26358dd68830ddc0c0db26f0fbcbb563513bb8a10454bb9670bbbdeac808';

const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2'; // ✨ VERIFIED!

const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';
const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';
const CLOCK = '0x6';

// Use the existing TEST memecoin from earlier
const COIN_TYPE = '0xe7c2f350f79efd6ddd4b29f6c52248706e45695dc4cdd873394767e932c775f9::auto_memefi::AUTO_MEMEFI';
const COIN_METADATA = '0x38323a6b00343c183a0432b8a0b4efed55c379942ac6264e68d2d3889c3a145c';
const CURVE_ID = '0x3b0e08ad3fd13325e54c503c65dec411ff1d26dee78e219c4dcc89deb3f9d7a0';

console.log('🚀 AUTO POOL CREATION TEST\n');
console.log('Using existing graduated curve from earlier test\n');
console.log(`Verified Pools: ${CETUS_POOLS}\n`);

async function main() {
  // Check curve state
  console.log('📊 Checking curve state...\n');
  
  const curve = await client.getObject({ id: CURVE_ID, options: { showContent: true } });
  const fields: any = curve.data?.content?.['fields'];
  
  console.log(`   Graduated: ${fields.graduated}`);
  console.log(`   LP Seeded: ${fields.lp_seeded}`);
  console.log(`   Reward Paid: ${fields.reward_paid}`);
  console.log(`   Supply: ${Number(fields.token_supply).toLocaleString()}\n`);
  
  if (fields.lp_seeded) {
    console.log('⚠️  LP already seeded - cannot test automatic pool creation on this curve');
    console.log('   Creating a NEW memecoin instead...\n');
    
    // We'll need to do the full flow - but let me just test the pool creation
    // with a manual approach using CLI
    
    console.log('💡 Solution: Let me create the pool manually with correct parameters\n');
    return;
  }
  
  // If not seeded, try to create pool
  console.log('🏊 Creating Cetus pool...\n');
  
  const poolTx = new Transaction();
  poolTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::seed_pool_and_create_cetus_with_lock`,
    typeArguments: [COIN_TYPE],
    arguments: [
      poolTx.object(PLATFORM_CONFIG),
      poolTx.object(CURVE_ID),
      poolTx.object(CETUS_CONFIG),
      poolTx.object(CETUS_POOLS),
      poolTx.pure.u32(60),
      poolTx.pure.u128('18446744073709551616'),
      poolTx.object(SUILFG_METADATA),
      poolTx.object(COIN_METADATA),
      poolTx.object(CLOCK),
    ],
  });
  poolTx.setGasBudget(500_000_000);
  
  const poolRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: poolTx,
    options: { showEffects: true, showObjectChanges: true },
  });
  
  console.log(`TX: ${poolRes.digest}`);
  console.log(`Status: ${poolRes.effects?.status?.status}\n`);
  
  if (poolRes.effects?.status?.status === 'success') {
    console.log('🎉 SUCCESS! Pool created!\n');
    
    for (const obj of poolRes.objectChanges || []) {
      if (obj.type === 'created') {
        console.log(`   ${obj.objectType?.split('::').pop()}: ${obj.objectId}`);
      }
    }
    
  } else {
    console.log(`Error: ${poolRes.effects?.status?.error}`);
  }
}

main().catch(console.error);
