// @ts-nocheck
/**
 * Complete workflow: Upgrade platform + Test fix
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { readFileSync } from 'fs';
import { bcs } from '@mysten/sui/bcs';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

// Current platform (v0.0.4 with bug)
const CURRENT_PACKAGE = '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047';
const UPGRADE_CAP = '0xde83c90c02cdba98c82be080eb31a9f74950467b962b2d0e5720a7ca596b483d';

// Platform objects (will work with upgraded version)
const PLATFORM_CONFIG = '0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c';
const TICKER_REGISTRY = '0x3bc08244a681e5fa1d125293ebd66c7017605d0c6d1820f4f9e5e1a7961a94e3';
const REFERRAL_REGISTRY = '0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d';

const FAUCET_PKG = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';
const CLOCK = '0x6';

const MAX_CURVE_SUPPLY = 737_000_000;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🔄 UPGRADE & TEST - Fix Supply Cap Bug                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ============================================================
// STEP 1: UPGRADE THE CONTRACT
// ============================================================

async function upgradeContract() {
  console.log('📦 Step 1: Upgrading Platform Contract\n');
  
  // Read compiled modules
  const basePath = '/workspace/suilfg_launch_with_memefi_testnet/build/suilfg_launch_memefi/bytecode_modules';
  const modules = [
    'bonding_curve.mv',
    'lp_locker.mv',
    'platform_config.mv',
    'referral_registry.mv',
    'ticker_registry.mv',
  ].map(name => {
    const bytes = readFileSync(`${basePath}/${name}`);
    console.log(`   ✅ Loaded: ${name} (${bytes.length} bytes)`);
    return Array.from(bytes);
  });
  
  // Dependencies (from Move.toml)
  const dependencies = [
    '0x1', // stdlib
    '0x2', // sui framework
    '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81', // test_sui_faucet
    '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb', // cetus
  ];
  
  console.log(`\n🔄 Creating upgrade transaction...`);
  console.log(`   Current package: ${CURRENT_PACKAGE}`);
  console.log(`   UpgradeCap: ${UPGRADE_CAP}\n`);
  
  const tx = new Transaction();
  
  // Authorize upgrade
  const ticket = tx.moveCall({
    target: '0x2::package::authorize_upgrade',
    arguments: [
      tx.object(UPGRADE_CAP),
      tx.pure.u8(0), // UpgradePolicy::COMPATIBLE
      tx.pure(bcs.vector(bcs.u8()).serialize([])), // digest placeholder
    ],
  });
  
  // Perform upgrade
  const receipt = tx.upgrade({
    modules,
    dependencies,
    package: CURRENT_PACKAGE,
    ticket,
  });
  
  // Commit upgrade
  tx.moveCall({
    target: '0x2::package::commit_upgrade',
    arguments: [tx.object(UPGRADE_CAP), receipt],
  });
  
  tx.setGasBudget(500_000_000);
  
  console.log('📝 Executing upgrade...');
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  
  console.log('✅ Upgrade TX:', result.digest);
  
  if (result.effects?.status?.status !== 'success') {
    throw new Error(`Upgrade failed: ${JSON.stringify(result.effects?.status)}`);
  }
  
  const published = result.objectChanges?.find((c: any) => c.type === 'published');
  const newPackage = published?.['packageId'];
  
  console.log(`🎉 UPGRADED TO v0.0.5!`);
  console.log(`   New Package: ${newPackage}\n`);
  
  return newPackage;
}

// ============================================================
// STEP 2: CREATE TEST MEMECOIN
// ============================================================

async function createTestCoin(newPlatformPkg: string) {
  console.log('📦 Step 2: Creating Test Memecoin\n');
  
  const { execSync } = await import('child_process');
  
  // Create unique memecoin
  const ticker = `FIX${Date.now().toString().slice(-6)}`;
  
  console.log(`   Creating memecoin with ticker: ${ticker}`);
  
  execSync(`
    mkdir -p /workspace/test_fix_coin/sources
    cat > /workspace/test_fix_coin/Move.toml <<EOF
[package]
name = "test_fix_coin"
version = "1.0.0"
edition = "2024.beta"
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
[addresses]
test_fix_coin = "0x0"
EOF

    cat > /workspace/test_fix_coin/sources/fix.move <<'MOVE'
module test_fix_coin::fix_memefi {
    use sui::coin::{Self};
    use sui::url;
    public struct FIX_MEMEFI has drop {}
    fun init(witness: FIX_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"${ticker}", b"Fix Test",
            b"Testing the supply cap fix - should stop at 737M!",
            option::some(url::new_unsafe_from_bytes(b"https://fix.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
MOVE
  `);
  
  const output = execSync('cd /workspace/test_fix_coin && sui client publish --gas-budget 100000000 --json', { encoding: 'utf-8' });
  const publishResult = JSON.parse(output);
  
  const pkgObj = publishResult.objectChanges.find((o: any) => o.type === 'published');
  const treasuryObj = publishResult.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('TreasuryCap'));
  const metadataObj = publishResult.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('CoinMetadata'));
  
  console.log(`   ✅ Package: ${pkgObj.packageId}`);
  console.log(`   ✅ TreasuryCap: ${treasuryObj.objectId}`);
  console.log(`   ✅ Metadata: ${metadataObj.objectId}\n`);
  
  return {
    packageId: pkgObj.packageId,
    treasuryId: treasuryObj.objectId,
    metadataId: metadataObj.objectId,
    coinType: `${pkgObj.packageId}::fix_memefi::FIX_MEMEFI`,
  };
}

// ============================================================
// STEP 3: CREATE BONDING CURVE
// ============================================================

async function createCurve(platformPkg: string, coin: any) {
  console.log('📈 Step 3: Creating Bonding Curve\n');
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${platformPkg}::bonding_curve::create_new_meme_token`,
    typeArguments: [coin.coinType],
    arguments: [
      tx.object(PLATFORM_CONFIG),
      tx.object(TICKER_REGISTRY),
      tx.object(coin.treasuryId),
      tx.object(coin.metadataId),
      tx.object(CLOCK),
    ],
  });
  
  tx.setGasBudget(100_000_000);
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showObjectChanges: true },
  });
  
  const curveObj: any = result.objectChanges?.find((o: any) => 
    o.type === 'created' && o.objectType?.includes('BondingCurve')
  );
  
  console.log(`   ✅ Curve created: ${curveObj.objectId}\n`);
  
  return curveObj.objectId;
}

// ============================================================
// STEP 4: TEST THE FIX - BUY TO LIMIT
// ============================================================

async function testSupplyCap(platformPkg: string, curveId: string, coinType: string) {
  console.log('🧪 Step 4: Testing Supply Cap Fix\n');
  
  console.log('   Test 1: Buy 500M tokens (should work)...');
  
  // Mint SUILFG
  await new Promise(r => setTimeout(r, 3000));
  
  const mintTx = new Transaction();
  mintTx.moveCall({
    target: `${FAUCET_PKG}::faucet::admin_mint`,
    arguments: [mintTx.object(FAUCET), mintTx.object(ADMIN_CAP), mintTx.pure.u64(50_000_000_000_000)],
  });
  mintTx.setGasBudget(50_000_000);
  
  const mintRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: mintTx,
    options: { showObjectChanges: true },
  });
  
  const coin1: any = mintRes.objectChanges?.find((o: any) => o.type === 'created' && o.objectType?.includes('SUILFG'));
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Buy 1
  const buyTx1 = new Transaction();
  buyTx1.moveCall({
    target: `${platformPkg}::bonding_curve::buy`,
    typeArguments: [coinType],
    arguments: [
      buyTx1.object(PLATFORM_CONFIG),
      buyTx1.object(curveId),
      buyTx1.object(REFERRAL_REGISTRY),
      buyTx1.object(coin1.objectId),
      buyTx1.pure(bcs.u64().serialize(50_000_000_000_000)),
      buyTx1.pure(bcs.u64().serialize(1)),
      buyTx1.pure(bcs.u64().serialize(Date.now() + 300000)),
      buyTx1.pure(bcs.vector(bcs.Address).serialize([])),
      buyTx1.object(CLOCK),
    ],
  });
  buyTx1.setGasBudget(100_000_000);
  
  const buy1 = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: buyTx1,
    options: { showBalanceChanges: true },
  });
  
  let tokens1 = 0, spent1 = 0;
  for (const change of buy1.balanceChanges || []) {
    if (change.coinType.includes('FIX_MEMEFI')) {
      tokens1 = Number(change.amount) / 1e9;
    } else if (change.coinType.includes('suilfg_memefi')) {
      spent1 = Math.abs(Number(change.amount)) / 1e9;
    }
  }
  
  console.log(`   ✅ Got ${tokens1.toLocaleString()} tokens for ${spent1.toLocaleString()} SUILFG`);
  
  // Check supply
  const curve1 = await client.getObject({ id: curveId, options: { showContent: true } });
  const supply1 = Number(curve1.data?.content?.['fields']?.token_supply);
  
  console.log(`   📊 Current supply: ${supply1.toLocaleString()} / ${MAX_CURVE_SUPPLY.toLocaleString()}\n`);
  
  // Test 2: Try to buy beyond limit
  console.log('   Test 2: Try to buy to 1B (should cap at 737M)...');
  
  await new Promise(r => setTimeout(r, 3000));
  
  const mintTx2 = new Transaction();
  mintTx2.moveCall({
    target: `${FAUCET_PKG}::faucet::admin_mint`,
    arguments: [mintTx2.object(FAUCET), mintTx2.object(ADMIN_CAP), mintTx2.pure.u64(500_000_000_000_000)],
  });
  mintTx2.setGasBudget(50_000_000);
  
  const mintRes2 = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: mintTx2,
    options: { showObjectChanges: true },
  });
  
  const coin2: any = mintRes2.objectChanges?.find((o: any) => o.type === 'created' && o.objectType?.includes('SUILFG'));
  
  await new Promise(r => setTimeout(r, 3000));
  
  const buyTx2 = new Transaction();
  buyTx2.moveCall({
    target: `${platformPkg}::bonding_curve::buy`,
    typeArguments: [coinType],
    arguments: [
      buyTx2.object(PLATFORM_CONFIG),
      buyTx2.object(curveId),
      buyTx2.object(REFERRAL_REGISTRY),
      buyTx2.object(coin2.objectId),
      buyTx2.pure(bcs.u64().serialize(500_000_000_000_000)),
      buyTx2.pure(bcs.u64().serialize(1)),
      buyTx2.pure(bcs.u64().serialize(Date.now() + 300000)),
      buyTx2.pure(bcs.vector(bcs.Address).serialize([])),
      buyTx2.object(CLOCK),
    ],
  });
  buyTx2.setGasBudget(200_000_000);
  
  const buy2 = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: buyTx2,
    options: { showBalanceChanges: true },
  });
  
  let tokens2 = 0, spent2 = 0;
  for (const change of buy2.balanceChanges || []) {
    if (change.coinType.includes('FIX_MEMEFI')) {
      tokens2 = Number(change.amount) / 1e9;
    } else if (change.coinType.includes('suilfg_memefi')) {
      spent2 = Math.abs(Number(change.amount)) / 1e9;
    }
  }
  
  console.log(`   ✅ Got ${tokens2.toLocaleString()} tokens for ${spent2.toLocaleString()} SUILFG`);
  
  // Final check
  const curveFinal = await client.getObject({ id: curveId, options: { showContent: true } });
  const finalSupply = Number(curveFinal.data?.content?.['fields']?.token_supply);
  
  console.log(`   📊 Final supply: ${finalSupply.toLocaleString()} / ${MAX_CURVE_SUPPLY.toLocaleString()}\n`);
  
  // Verification
  console.log('╔══════════════════════════════════════════════════════════════╗');
  if (finalSupply <= MAX_CURVE_SUPPLY) {
    console.log('║  ✅ FIX VERIFIED! Supply capped at MAX_CURVE_SUPPLY!        ║');
  } else {
    console.log('║  ❌ BUG STILL EXISTS! Supply exceeded max!                  ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const totalSpent = spent1 + spent2;
  
  console.log('📊 RESULTS:');
  console.log(`   Total tokens bought: ${(tokens1 + tokens2).toLocaleString()}`);
  console.log(`   Total SUILFG spent: ${totalSpent.toLocaleString()}`);
  console.log(`   Final supply: ${finalSupply.toLocaleString()}`);
  console.log(`   Reserved for LP/team: ${(1_000_000_000 - finalSupply).toLocaleString()}`);
  
  if (finalSupply <= MAX_CURVE_SUPPLY) {
    console.log('\n✅ Fix validated! Contract now:');
    console.log('   - Stops at 737M tokens');
    console.log('   - Reserves 263M for LP/team/burn');
    console.log('   - Prevents overselling');
    console.log('   - Maintains proper tokenomics');
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  try {
    const newPackage = await upgradeContract();
    const coin = await createTestCoin(newPackage);
    const curveId = await createCurve(newPackage, coin);
    await testSupplyCap(newPackage, curveId, coin.coinType);
    
    console.log('\n🎉 ALL TESTS COMPLETE!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
