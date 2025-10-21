// @ts-nocheck
/**
 * Test Graduation - Buy out bonding curve to trigger pool creation
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

// From previous test
const CURVE_ID = '0x6a0f765484f8ea1d40061913348590556065b131a7f48e0d5ed4dd120ac4a874';
const COIN_TYPE = '0x0c6e5866d36a4d734e550ec4b5ebeef32d40eca675ddb64185b572d45f49bc4f::test_memefi::TEST_MEMEFI';

const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';

const PLATFORM_PKG = '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047';
const PLATFORM_CONFIG = '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c';
const REFERRAL = '0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d';

const MAX_CURVE_SUPPLY = 737_000_000; // 737M tokens

console.log('🎓 GRADUATION TEST\n');

// Check curve status
console.log('📊 Checking curve...');
const curve = await client.getObject({ id: CURVE_ID, options: { showContent: true } });
const fields: any = curve.data?.content?.['fields'];
const currentSupply = Number(fields.token_supply);
const remaining = MAX_CURVE_SUPPLY - currentSupply;

console.log(`Current: ${currentSupply.toLocaleString()} / ${MAX_CURVE_SUPPLY.toLocaleString()}`);
console.log(`Remaining: ${remaining.toLocaleString()} tokens`);
console.log(`Graduated: ${fields.graduated}\n`);

if (fields.graduated) {
  console.log('✅ Already graduated!');
  process.exit(0);
}

// Mint SUILFG (2x remaining for safety)
const suilfgNeeded = Math.ceil(remaining * 2 * 1e9);
console.log(`💰 Minting ${(suilfgNeeded / 1e9).toLocaleString()} SUILFG...\n`);

await new Promise(r => setTimeout(r, 2000));

const mintTx = new Transaction();
mintTx.moveCall({
  target: `${FAUCET_PKG}::faucet::admin_mint`,
  arguments: [mintTx.object(FAUCET), mintTx.object(ADMIN_CAP), mintTx.pure.u64(suilfgNeeded)],
});
mintTx.setGasBudget(50_000_000);

const mintResult = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: mintTx,
  options: { showObjectChanges: true },
});

const suilfgCoin: any = mintResult.objectChanges?.find((o: any) => 
  o.type === 'created' && o.objectType?.includes('SUILFG')
);

console.log(`✅ Minted! Coin: ${suilfgCoin.objectId}\n`);

// Wait for transaction to settle
console.log('⏳ Waiting for transaction to settle...');
await new Promise(r => setTimeout(r, 5000));

// BUY OUT THE CURVE!
console.log('🚀 BUYING OUT BONDING CURVE...\n');

const buyTx = new Transaction();
buyTx.moveCall({
  target: `${PLATFORM_PKG}::bonding_curve::buy`,
  typeArguments: [COIN_TYPE],
  arguments: [
    buyTx.object(PLATFORM_CONFIG),
    buyTx.object(CURVE_ID),
    buyTx.object(REFERRAL),
    buyTx.object(suilfgCoin.objectId),
    buyTx.pure(bcs.u64().serialize(suilfgNeeded)),
    buyTx.pure(bcs.u64().serialize(1)),
    buyTx.pure(bcs.u64().serialize(Date.now() + 300000)),
    buyTx.pure(bcs.vector(bcs.Address).serialize([])),
    buyTx.object('0x6'),
  ],
});

buyTx.setGasBudget(200_000_000); // Higher gas for graduation

const buyResult = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: buyTx,
  options: {
    showEffects: true,
    showBalanceChanges: true,
    showEvents: true,
    showObjectChanges: true,
  },
});

console.log('📋 Transaction:', buyResult.digest);
console.log('Status:', buyResult.effects?.status?.status, '\n');

// Check results
for (const change of buyResult.balanceChanges || []) {
  if (change.coinType.includes('TEST_MEMEFI')) {
    console.log(`💎 Tokens: ${(Number(change.amount) / 1e9).toLocaleString()}`);
  }
}

// Look for graduation/pool events
console.log('\n🔍 Events:');
for (const event of buyResult.events || []) {
  console.log(`   ${event.type}`);
  if (event.type.includes('Graduation') || event.type.includes('Pool')) {
    console.log('   ✅ POOL EVENT!', event);
  }
}

// Check for created pool objects
console.log('\n📦 Objects Created:');
for (const obj of buyResult.objectChanges || []) {
  if (obj.type === 'created') {
    console.log(`   ${obj['objectType']}`);
    if (obj['objectType']?.includes('Pool') || obj['objectType']?.includes('pool')) {
      console.log('   ✅ POOL CREATED!', obj['objectId']);
    }
  }
}

// Final status
const finalCurve = await client.getObject({ id: CURVE_ID, options: { showContent: true } });
const finalFields: any = finalCurve.data?.content?.['fields'];

console.log('\n╔══════════════════════════════════════════════════════════════╗');
if (finalFields.graduated) {
  console.log('║  🎊 GRADUATION SUCCESSFUL! 🎊                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Final supply: ${Number(finalFields.token_supply).toLocaleString()}`);
  console.log(`✅ Graduated: ${finalFields.graduated}`);
  console.log(`✅ Pool created and ready for trading!`);
} else {
  console.log('║  ⚠️  Not graduated yet - may need more tokens                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Supply: ${Number(finalFields.token_supply).toLocaleString()} / ${MAX_CURVE_SUPPLY.toLocaleString()}`);
}
