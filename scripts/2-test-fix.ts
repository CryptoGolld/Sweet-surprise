// @ts-nocheck
/**
 * Test the supply cap fix - verify it stops at 737M
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { execSync } from 'child_process';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

// v0.0.5 Platform (FIXED!)
const PLATFORM_PKG = process.env.PLATFORM_PKG || '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047';
const PLATFORM_CONFIG = process.env.PLATFORM_CONFIG || '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c';
const TICKER_REGISTRY = process.env.TICKER_REGISTRY || '0x3bc08244a681e5fa1d125293ebd66c7017605d0c6d1820f4f9e5e1a7961a94e3';
const REFERRAL_REGISTRY = process.env.REFERRAL_REGISTRY || '0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d';

const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';
const CLOCK = '0x6';

const MAX_CURVE_SUPPLY = 737_000_000;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🧪 TESTING SUPPLY CAP FIX (v0.0.5)                          ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
  // Create test memecoin
  console.log('📦 Step 1: Creating test memecoin...\n');
  
  const ticker = `FIX${Date.now().toString().slice(-6)}`;
  
  execSync(`
    rm -rf /workspace/test_fix_coin
    mkdir -p /workspace/test_fix_coin/sources
    cat > /workspace/test_fix_coin/Move.toml <<'TOML'
[package]
name = "test_fix_coin"
version = "1.0.0"
edition = "2024.beta"
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
[addresses]
test_fix_coin = "0x0"
TOML

    cat > /workspace/test_fix_coin/sources/fix.move <<'MOVE'
module test_fix_coin::fix_memefi {
    use sui::coin::{Self};
    use sui::url;
    public struct FIX_MEMEFI has drop {}
    fun init(witness: FIX_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"${ticker}", b"Fix Test",
            b"Testing supply cap fix - should stop at 737M!",
            option::some(url::new_unsafe_from_bytes(b"https://fix.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
MOVE
  `.replace('${ticker}', ticker));
  
  const publishOutput = execSync('cd /workspace/test_fix_coin && sui client publish --gas-budget 100000000 --json', { encoding: 'utf-8' });
  const publishData = JSON.parse(publishOutput);
  
  const pkg = publishData.objectChanges.find((o: any) => o.type === 'published');
  const treasury = publishData.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('TreasuryCap'));
  const metadata = publishData.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('CoinMetadata'));
  
  const coinType = `${pkg.packageId}::fix_memefi::FIX_MEMEFI`;
  
  console.log(`   ✅ Published: ${pkg.packageId}`);
  console.log(`   ✅ Ticker: ${ticker}`);
  console.log(`   ✅ Type: ${coinType}\n`);
  
  // Create bonding curve
  console.log('📈 Step 2: Creating bonding curve...\n');
  
  await new Promise(r => setTimeout(r, 3000));
  
  const curveTx = new Transaction();
  curveTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::create_new_meme_token`,
    typeArguments: [coinType],
    arguments: [
      curveTx.object(PLATFORM_CONFIG),
      curveTx.object(TICKER_REGISTRY),
      curveTx.object(treasury.objectId),
      curveTx.object(metadata.objectId),
      curveTx.object(CLOCK),
    ],
  });
  curveTx.setGasBudget(100_000_000);
  
  const curveRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: curveTx,
    options: { showObjectChanges: true },
  });
  
  const curve: any = curveRes.objectChanges?.find((o: any) => o.type === 'created' && o.objectType?.includes('BondingCurve'));
  const curveId = curve.objectId;
  
  console.log(`   ✅ Curve: ${curveId}\n`);
  
  // Test: Try to buy way more than 737M
  console.log('🧪 Step 3: Testing supply cap...\n');
  console.log('   Attempting to buy with 500K SUILFG (would buy >737M)...');
  console.log('   EXPECTED: Should cap at 737M and refund excess\n');
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Mint huge amount of SUILFG
  const mintTx = new Transaction();
  mintTx.moveCall({
    target: `${FAUCET_PKG}::faucet::admin_mint`,
    arguments: [
      mintTx.object(FAUCET),
      mintTx.object(ADMIN_CAP),
      mintTx.pure.u64(500_000_000_000_000), // 500K SUILFG
    ],
  });
  mintTx.setGasBudget(50_000_000);
  
  const mintRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: mintTx,
    options: { showObjectChanges: true },
  });
  
  const suilfgCoin: any = mintRes.objectChanges?.find((o: any) => o.type === 'created' && o.objectType?.includes('SUILFG'));
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Buy with massive amount
  const buyTx = new Transaction();
  buyTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::buy`,
    typeArguments: [coinType],
    arguments: [
      buyTx.object(PLATFORM_CONFIG),
      buyTx.object(curveId),
      buyTx.object(REFERRAL_REGISTRY),
      buyTx.object(suilfgCoin.objectId),
      buyTx.pure(bcs.u64().serialize(500_000_000_000_000)),
      buyTx.pure(bcs.u64().serialize(1)),
      buyTx.pure(bcs.u64().serialize(Date.now() + 300000)),
      buyTx.pure(bcs.vector(bcs.Address).serialize([])),
      buyTx.object(CLOCK),
    ],
  });
  buyTx.setGasBudget(200_000_000);
  
  const buyRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: buyTx,
    options: { showBalanceChanges: true },
  });
  
  console.log(`   📋 TX: ${buyRes.digest}`);
  console.log(`   Status: ${buyRes.effects?.status?.status}\n`);
  
  let tokensReceived = 0;
  let suilfgSpent = 0;
  
  for (const change of buyRes.balanceChanges || []) {
    if (change.coinType.includes('FIX_MEMEFI')) {
      tokensReceived = Number(change.amount) / 1e9;
      console.log(`   💎 Tokens received: ${tokensReceived.toLocaleString()}`);
    } else if (change.coinType.includes('suilfg_memefi')) {
      suilfgSpent = Math.abs(Number(change.amount)) / 1e9;
      console.log(`   💰 SUILFG spent: ${suilfgSpent.toLocaleString()}`);
    }
  }
  
  // Check final supply
  const finalCurve = await client.getObject({ id: curveId, options: { showContent: true } });
  const finalSupply = Number(finalCurve.data?.content?.['fields']?.token_supply);
  
  console.log(`   📊 Final supply: ${finalSupply.toLocaleString()}\n`);
  
  // VERIFICATION
  console.log('╔══════════════════════════════════════════════════════════════╗');
  
  if (finalSupply <= MAX_CURVE_SUPPLY && finalSupply > MAX_CURVE_SUPPLY - 10_000_000) {
    console.log('║  ✅✅✅ FIX VERIFIED! ✅✅✅                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log('🎉 Supply capped at MAX_CURVE_SUPPLY!');
    console.log(`   Sold: ${finalSupply.toLocaleString()} (at or near 737M)`);
    console.log(`   Reserved: ${(1_000_000_000 - finalSupply).toLocaleString()} for LP/team/burn`);
    console.log(`   Cost: ~${suilfgSpent.toLocaleString()} SUILFG`);
    
    if (suilfgSpent < 15_000 && suilfgSpent > 10_000) {
      console.log(`   ✅ Cost is correct! (~13K expected, got ${suilfgSpent.toFixed(0)}K)`);
    } else {
      console.log(`   ⚠️  Cost seems off (expected ~13K, got ${suilfgSpent.toFixed(0)}K)`);
    }
    
  } else if (finalSupply > MAX_CURVE_SUPPLY) {
    console.log('║  ❌ BUG STILL EXISTS! Exceeded 737M limit!                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`   Sold: ${finalSupply.toLocaleString()} (OVER ${MAX_CURVE_SUPPLY.toLocaleString()})`);
    console.log(`   Excess: ${(finalSupply - MAX_CURVE_SUPPLY).toLocaleString()} tokens`);
    console.log(`   Cost: ${suilfgSpent.toLocaleString()} SUILFG (way too high!)`);
  } else {
    console.log('║  ⚠️  Partial buy - need more SUILFG to test limit           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`   Sold: ${finalSupply.toLocaleString()} / ${MAX_CURVE_SUPPLY.toLocaleString()}`);
  }
}

main().catch(console.error);
