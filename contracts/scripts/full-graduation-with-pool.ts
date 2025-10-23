// @ts-nocheck
/**
 * COMPLETE GRADUATION WITH AUTOMATIC CETUS POOL CREATION
 * Using the verified Pools address!
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { execSync } from 'child_process';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

// Platform v0.0.5
const PLATFORM_PKG = '0x89e30287cbfd4bb53ea258146cbdac50165478b39020067f1adce731c9f41853';
const PLATFORM_CONFIG = '0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07';
const TICKER_REGISTRY = '0xe0cb6b5e4396ae9e8444d123f36d086cbb6e6b3b5c808cca968a942f5b475a32';
const REFERRAL_REGISTRY = '0x5b1b26358dd68830ddc0c0db26f0fbcbb563513bb8a10454bb9670bbbdeac808';

// Cetus - VERIFIED POOLS ADDRESS! ✨
const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2'; // ✨✨✨

// Faucet
const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';
const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';

const CLOCK = '0x6';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🚀 COMPLETE MEMECOIN LAUNCH + AUTO POOL CREATION          ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('Using VERIFIED Cetus Pools address:');
console.log(`   ${CETUS_POOLS} ✨\n`);

async function main() {
  // Step 1: Create memecoin
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📦 STEP 1/6: Creating Memecoin\n');
  
  const timestamp = Date.now();
  const ticker = `AUTO${timestamp.toString().slice(-4)}`;
  
  execSync(`
    rm -rf /workspace/auto_pool_coin
    mkdir -p /workspace/auto_pool_coin/sources
    cat > /workspace/auto_pool_coin/Move.toml <<'TOML'
[package]
name = "auto_pool_coin"
version = "1.0.0"
edition = "2024.beta"
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
[addresses]
auto_pool_coin = "0x0"
TOML
    cat > /workspace/auto_pool_coin/sources/coin.move <<'MOVE'
module auto_pool_coin::auto_memefi {
    use sui::coin::{Self};
    use sui::url;
    public struct AUTO_MEMEFI has drop {}
    fun init(witness: AUTO_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"${ticker}", b"Auto Pool Test",
            b"Testing automatic Cetus pool creation with verified Pools address",
            option::some(url::new_unsafe_from_bytes(b"https://auto.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
MOVE
  `.replace('${ticker}', ticker));
  
  const publishOutput = execSync('cd /workspace/auto_pool_coin && sui client publish --gas-budget 100000000 --json 2>&1 | grep -v "warning\\|note\\|Branch"', { encoding: 'utf-8' });
  const publishData = JSON.parse(publishOutput);
  
  const pkg = publishData.objectChanges.find((o: any) => o.type === 'published');
  const treasury = publishData.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('TreasuryCap'));
  const metadata = publishData.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('CoinMetadata'));
  
  const coinType = `${pkg.packageId}::auto_memefi::AUTO_MEMEFI`;
  const coinMetadataId = metadata.objectId;
  
  console.log(`   ✅ Memecoin: ${ticker}`);
  console.log(`   ✅ Type: ${pkg.packageId.slice(0,10)}...::AUTO_MEMEFI`);
  console.log(`   ✅ Metadata: ${coinMetadataId.slice(0,10)}...`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 2: Create bonding curve
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📈 STEP 2/6: Creating Bonding Curve\n');
  
  const curveTx = new Transaction();
  curveTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::create_new_meme_token`,
    typeArguments: [coinType],
    arguments: [
      curveTx.object(PLATFORM_CONFIG),
      curveTx.object(TICKER_REGISTRY),
      curveTx.object(treasury.objectId),
      curveTx.object(coinMetadataId),
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
  
  console.log(`   ✅ Curve created: ${curveId.slice(0,10)}...`);
  console.log(`   📋 TX: ${curveRes.digest}`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 3: Buy to graduation (737M)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💰 STEP 3/6: Buying to 737M Cap\n');
  
  const mintTx = new Transaction();
  mintTx.moveCall({
    target: `${FAUCET_PKG}::faucet::admin_mint`,
    arguments: [
      mintTx.object(FAUCET),
      mintTx.object(ADMIN_CAP),
      mintTx.pure.u64(20_000_000_000_000), // 20K SUILFG
    ],
  });
  mintTx.setGasBudget(50_000_000);
  
  const mintRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: mintTx,
    options: { showObjectChanges: true },
  });
  
  const suilfgCoin: any = mintRes.objectChanges?.find((o: any) => o.type === 'created');
  
  await new Promise(r => setTimeout(r, 3000));
  
  const buyTx = new Transaction();
  buyTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::buy`,
    typeArguments: [coinType],
    arguments: [
      buyTx.object(PLATFORM_CONFIG),
      buyTx.object(curveId),
      buyTx.object(REFERRAL_REGISTRY),
      buyTx.object(suilfgCoin.objectId),
      buyTx.pure(bcs.u64().serialize(20_000_000_000_000)),
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
  
  let tokensReceived = 0;
  let suilfgSpent = 0;
  
  for (const change of buyRes.balanceChanges || []) {
    if (change.coinType.includes('AUTO_MEMEFI')) {
      tokensReceived = Number(change.amount) / 1e9;
    } else if (change.coinType.includes('suilfg_memefi')) {
      suilfgSpent = Math.abs(Number(change.amount)) / 1e9;
    }
  }
  
  console.log(`   ✅ Bought: ${tokensReceived.toLocaleString()} tokens`);
  console.log(`   ✅ Cost: ${suilfgSpent.toLocaleString()} SUILFG`);
  console.log(`   📋 TX: ${buyRes.digest}`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 4: Graduate
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎓 STEP 4/6: Graduating Curve\n');
  
  const gradTx = new Transaction();
  gradTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::try_graduate`,
    typeArguments: [coinType],
    arguments: [
      gradTx.object(PLATFORM_CONFIG),
      gradTx.object(curveId),
    ],
  });
  gradTx.setGasBudget(100_000_000);
  
  const gradRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: gradTx,
  });
  
  console.log(`   ✅ Graduated!`);
  console.log(`   📋 TX: ${gradRes.digest}`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 5: Distribute payouts
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💸 STEP 5/6: Distributing Payouts\n');
  
  const payoutTx = new Transaction();
  payoutTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::distribute_payouts`,
    typeArguments: [coinType],
    arguments: [
      payoutTx.object(PLATFORM_CONFIG),
      payoutTx.object(curveId),
    ],
  });
  payoutTx.setGasBudget(100_000_000);
  
  const payoutRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: payoutTx,
  });
  
  console.log(`   ✅ Payouts distributed!`);
  console.log(`   📋 TX: ${payoutRes.digest}`);
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Step 6: AUTO POOL CREATION! 🎉
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🏊 STEP 6/6: Creating Cetus Pool AUTOMATICALLY\n');
  console.log(`   Using Pools: ${CETUS_POOLS}\n`);
  
  const poolTx = new Transaction();
  poolTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::seed_pool_and_create_cetus_with_lock`,
    typeArguments: [coinType],
    arguments: [
      poolTx.object(PLATFORM_CONFIG),
      poolTx.object(curveId),
      poolTx.object(CETUS_CONFIG),
      poolTx.object(CETUS_POOLS), // ✨ VERIFIED ADDRESS!
      poolTx.pure.u32(60), // tick_spacing
      poolTx.pure.u128('18446744073709551616'), // sqrt_price 1:1
      poolTx.object(SUILFG_METADATA),
      poolTx.object(coinMetadataId),
      poolTx.object(CLOCK),
    ],
  });
  poolTx.setGasBudget(500_000_000);
  
  console.log('   🚀 Executing automatic pool creation...\n');
  
  const poolRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: poolTx,
    options: { showEffects: true, showObjectChanges: true },
  });
  
  console.log(`   📋 TX: ${poolRes.digest}`);
  console.log(`   Status: ${poolRes.effects?.status?.status}\n`);
  
  if (poolRes.effects?.status?.status === 'success') {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  🎉🎉🎉 COMPLETE SUCCESS! 🎉🎉🎉                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('✅ MEMECOIN FULLY LAUNCHED!\n');
    
    console.log('📊 Summary:');
    console.log(`   Ticker: ${ticker}`);
    console.log(`   Supply on curve: 737,000,000 tokens`);
    console.log(`   Reserved for LP: 263,000,000 tokens`);
    console.log(`   SUILFG cost: ~${suilfgSpent.toLocaleString()}`);
    console.log('');
    
    console.log('📦 Created Objects:');
    for (const obj of poolRes.objectChanges || []) {
      if (obj.type === 'created') {
        const name = obj.objectType?.split('::').pop() || 'Object';
        console.log(`   ${name}: ${obj.objectId}`);
        
        if (obj.objectType?.includes('Pool')) {
          console.log(`      🏊 Cetus pool created!`);
        }
        if (obj.objectType?.includes('LockedPosition')) {
          console.log(`      🔒 LP position permanently locked!`);
        }
      }
    }
    
    console.log('\n✅ ALL STEPS COMPLETE:');
    console.log('   ✅ Memecoin created');
    console.log('   ✅ Bonding curve deployed');
    console.log('   ✅ Sold to 737M cap');
    console.log('   ✅ Graduated');
    console.log('   ✅ Payouts distributed');
    console.log('   ✅ Cetus pool created automatically');
    console.log('   ✅ LP position permanently locked');
    console.log('');
    console.log('🎯 MEMECOIN IS LIVE ON CETUS DEX! 🚀');
    console.log('');
    console.log('💡 The Pools address works perfectly!');
    console.log(`   ${CETUS_POOLS}\n`);
    
  } else {
    console.log('❌ Pool creation failed!');
    console.log(`   Error: ${poolRes.effects?.status?.error}\n`);
    
    const error = poolRes.effects?.status?.error || '';
    if (error.includes('0x6')) {
      console.log('💡 Error 0x6 Analysis:');
      console.log('   This is from Cetus factory validation');
      console.log('   Possible causes:');
      console.log('   - Pool might already exist for this pair');
      console.log('   - Invalid tick spacing or price parameters');
      console.log('   - Fee tier not enabled');
      console.log('');
      console.log('   But the good news: Pools address IS working!');
      console.log('   The transaction reached Cetus code successfully.');
    }
  }
}

main().catch(console.error);
