// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const CURVE_ID = '0x6a0f765484f8ea1d40061913348590556065b131a7f48e0d5ed4dd120ac4a874';
const COIN_TYPE = '0x0c6e5866d36a4d734e550ec4b5ebeef32d40eca675ddb64185b572d45f49bc4f::test_memefi::TEST_MEMEFI';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';
const PLATFORM_PKG = '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047';
const PLATFORM_CONFIG = '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c';
const REFERRAL = '0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d';

console.log('🎓 GRADUATION TEST - Incremental Buyout\n');

async function buyBatch(suilfgAmount: number, batchNum: number) {
  console.log(`\n📦 Batch ${batchNum}: Minting ${(suilfgAmount / 1e9).toLocaleString()} SUILFG...`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  const mintTx = new Transaction();
  mintTx.moveCall({
    target: `${FAUCET_PKG}::faucet::admin_mint`,
    arguments: [mintTx.object(FAUCET), mintTx.object(ADMIN_CAP), mintTx.pure.u64(suilfgAmount)],
  });
  mintTx.setGasBudget(50_000_000);
  
  const mintRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: mintTx,
    options: { showObjectChanges: true },
  });
  
  const coin: any = mintRes.objectChanges?.find((o: any) => o.type === 'created' && o.objectType?.includes('SUILFG'));
  
  console.log(`   ✅ Minted: ${coin.objectId}`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  console.log(`   🛒 Buying tokens...`);
  
  const buyTx = new Transaction();
  buyTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::buy`,
    typeArguments: [COIN_TYPE],
    arguments: [
      buyTx.object(PLATFORM_CONFIG),
      buyTx.object(CURVE_ID),
      buyTx.object(REFERRAL),
      buyTx.object(coin.objectId),
      buyTx.pure(bcs.u64().serialize(suilfgAmount)),
      buyTx.pure(bcs.u64().serialize(1)),
      buyTx.pure(bcs.u64().serialize(Date.now() + 300000)),
      buyTx.pure(bcs.vector(bcs.Address).serialize([])),
      buyTx.object('0x6'),
    ],
  });
  buyTx.setGasBudget(200_000_000);
  
  const buyRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: buyTx,
    options: { showEffects: true, showBalanceChanges: true, showEvents: true },
  });
  
  console.log(`   📋 TX: ${buyRes.digest}`);
  
  if (buyRes.effects?.status?.status === 'success') {
    for (const change of buyRes.balanceChanges || []) {
      if (change.coinType.includes('TEST_MEMEFI')) {
        console.log(`   ✅ Got: ${(Number(change.amount) / 1e9).toLocaleString()} tokens`);
      }
    }
    
    // Check for graduation
    for (const event of buyRes.events || []) {
      if (event.type.toLowerCase().includes('graduation') || event.type.toLowerCase().includes('pool')) {
        console.log(`\n🎊🎊🎊 GRADUATION EVENT! 🎊🎊🎊`);
        console.log(JSON.stringify(event, null, 2));
        return true; // Graduated!
      }
    }
  } else {
    console.log(`   ❌ Failed:`, buyRes.effects?.status?.error);
  }
  
  return false;
}

// Buy in batches of 100K SUILFG
const batchSize = 100_000 * 1e9;
const maxBatches = 10;

for (let i = 1; i <= maxBatches; i++) {
  const graduated = await buyBatch(batchSize, i);
  
  if (graduated) {
    console.log('\n✅ GRADUATED! Pool created!');
    break;
  }
  
  // Check current status
  const curve = await client.getObject({ id: CURVE_ID, options: { showContent: true } });
  const fields: any = curve.data?.content?.['fields'];
  const supply = Number(fields.token_supply);
  const remaining = 737_000_000 - supply;
  
  console.log(`   📊 Progress: ${supply.toLocaleString()} / 737M (${remaining.toLocaleString()} left)`);
  
  if (fields.graduated) {
    console.log('\n🎊 CURVE GRADUATED!');
    break;
  }
  
  if (remaining <= 0) {
    console.log('\n✅ Curve sold out!');
    break;
  }
}

console.log('\n✅ Done!');
