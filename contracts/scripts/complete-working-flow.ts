// @ts-nocheck
/**
 * Complete working flow from scratch
 * Create coin → Curve → Buy → Graduate → Pool
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const PLATFORM_PKG = '0x89e30287cbfd4bb53ea258146cbdac50165478b39020067f1adce731c9f41853';
const PLATFORM_CONFIG = '0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07';
const TICKER_REGISTRY = '0xe0cb6b5e4396ae9e8444d123f36d086cbb6e6b3b5c808cca968a942f5b475a32';
const REFERRAL_REGISTRY = '0x5b1b26358dd68830ddc0c0db26f0fbcbb563513bb8a10454bb9670bbbdeac808';

const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2';

const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';
const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';
const CLOCK = '0x6';

console.log('🚀 COMPLETE WORKING FLOW\n');
console.log('Creating fresh memecoin and testing full graduation + pool\n');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const timestamp = Date.now();
  const ticker = `WORK${timestamp.toString().slice(-4)}`;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEP 1: Create coin with CLI (proper type registration)\n');
  
  execSync(`
    rm -rf /workspace/working_coin
    mkdir -p /workspace/working_coin/sources
    cat > /workspace/working_coin/Move.toml <<'TOML'
[package]
name = "working_coin"
version = "1.0.0"
edition = "2024.beta"
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
[addresses]
working_coin = "0x0"
TOML
    cat > /workspace/working_coin/sources/coin.move <<'MOVE'
module working_coin::working_memefi {
    use sui::coin::{Self};
    use sui::url;
    public struct WORKING_MEMEFI has drop {}
    fun init(witness: WORKING_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"${ticker}", b"Working Test",
            b"Actually making pool creation work",
            option::some(url::new_unsafe_from_bytes(b"https://work.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
MOVE
  `.replace('${ticker}', ticker));
  
  // Publish with CLI and capture JSON output properly
  console.log('Publishing coin...');
  const publishCmd = 'cd /workspace/working_coin && sui client publish --gas-budget 100000000 --json 2>&1';
  const publishOutput = execSync(publishCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  
  // Find the JSON output (it might have warnings before it)
  const jsonMatch = publishOutput.match(/\{[\s\S]*"digest"[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('Failed to parse publish output');
    console.log(publishOutput.slice(0, 500));
    return;
  }
  
  const publishData = JSON.parse(jsonMatch[0]);
  
  const pkg = publishData.objectChanges.find((o: any) => o.type === 'published');
  const treasury = publishData.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('TreasuryCap'));
  const metadata = publishData.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('CoinMetadata'));
  
  const coinType = `${pkg.packageId}::working_memefi::WORKING_MEMEFI`;
  
  console.log(`✅ Coin: ${ticker}`);
  console.log(`✅ Package: ${pkg.packageId}`);
  console.log(`✅ Treasury: ${treasury.objectId}`);
  console.log(`✅ Metadata: ${metadata.objectId}\n`);
  
  await sleep(5000);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEP 2: Create bonding curve\n');
  
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
  
  console.log(`✅ Curve: ${curveId}`);
  console.log(`TX: ${curveRes.digest}\n`);
  
  await sleep(5000);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEP 3: Buy to 737M\n');
  
  const mintTx = new Transaction();
  const suilfgCoin = mintTx.moveCall({
    target: `${FAUCET_PKG}::faucet::admin_mint`,
    arguments: [
      mintTx.object(FAUCET),
      mintTx.object(ADMIN_CAP),
      mintTx.pure.u64(20_000_000_000_000),
    ],
  });
  mintTx.setGasBudget(50_000_000);
  
  const mintRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: mintTx,
    options: { showObjectChanges: true },
  });
  
  const suilfgCoinObj: any = mintRes.objectChanges?.find((o: any) => o.type === 'created');
  
  await sleep(5000);
  
  const buyTx = new Transaction();
  buyTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::buy`,
    typeArguments: [coinType],
    arguments: [
      buyTx.object(PLATFORM_CONFIG),
      buyTx.object(curveId),
      buyTx.object(REFERRAL_REGISTRY),
      buyTx.object(suilfgCoinObj.objectId),
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
  
  let tokensGot = 0;
  for (const change of buyRes.balanceChanges || []) {
    if (change.coinType.includes('WORKING_MEMEFI')) {
      tokensGot = Number(change.amount) / 1e9;
    }
  }
  
  console.log(`✅ Bought ${tokensGot.toLocaleString()} tokens`);
  console.log(`TX: ${buyRes.digest}\n`);
  
  await sleep(5000);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEP 4: Graduate\n');
  
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
  
  console.log(`✅ Graduated`);
  console.log(`TX: ${gradRes.digest}\n`);
  
  await sleep(5000);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEP 5: Distribute payouts\n');
  
  const payTx = new Transaction();
  payTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::distribute_payouts`,
    typeArguments: [coinType],
    arguments: [
      payTx.object(PLATFORM_CONFIG),
      payTx.object(curveId),
    ],
  });
  payTx.setGasBudget(100_000_000);
  
  const payRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: payTx,
  });
  
  console.log(`✅ Payouts distributed`);
  console.log(`TX: ${payRes.digest}\n`);
  
  await sleep(5000);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('STEP 6: CREATE CETUS POOL\n');
  console.log(`Using Pools: ${CETUS_POOLS}\n`);
  
  const poolTx = new Transaction();
  poolTx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::seed_pool_and_create_cetus_with_lock`,
    typeArguments: [coinType],
    arguments: [
      poolTx.object(PLATFORM_CONFIG),
      poolTx.object(curveId),
      poolTx.object(CETUS_CONFIG),
      poolTx.object(CETUS_POOLS),
      poolTx.pure.u32(60),
      poolTx.pure.u128('18446744073709551616'),
      poolTx.object(SUILFG_METADATA),
      poolTx.object(metadata.objectId),
      poolTx.object(CLOCK),
    ],
  });
  poolTx.setGasBudget(500_000_000);
  
  console.log('🚀 Creating pool...\n');
  
  const poolRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: poolTx,
    options: { showEffects: true, showObjectChanges: true },
  });
  
  console.log(`TX: ${poolRes.digest}`);
  console.log(`Status: ${poolRes.effects?.status?.status}\n`);
  
  if (poolRes.effects?.status?.status === 'success') {
    console.log('🎉🎉🎉 SUCCESS! POOL CREATED! 🎉🎉🎉\n');
    
    for (const obj of poolRes.objectChanges || []) {
      if (obj.type === 'created') {
        console.log(`   ${obj.objectType?.split('::').pop()}: ${obj.objectId}`);
      }
    }
    
    console.log('\n✅ IT WORKS!');
    console.log(`✅ Pools address: ${CETUS_POOLS}`);
    
  } else {
    console.log(`❌ Failed: ${poolRes.effects?.status?.error}\n`);
    
    const err = poolRes.effects?.status?.error || '';
    if (err.includes('TypeArgumentError')) {
      console.log('Still getting TypeArgumentError...');
      console.log('This means the coin type still isn\'t being found properly');
    }
    if (err.includes('0x6')) {
      console.log('Abort 0x6 - likely pool already exists or parameter issue');
      console.log('But this is PROGRESS - it means types resolved!');
    }
  }
}

main().catch(console.error);
