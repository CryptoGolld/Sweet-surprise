// @ts-nocheck
/**
 * Simple standalone test: Create coin + Cetus pool
 * No bonding curve - just test the Cetus integration
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { execSync } from 'child_process';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

// Cetus
const CETUS_PKG = '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12';
const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2';

// SUILFG
const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';

const CLOCK = '0x6';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🧪 SIMPLE CETUS POOL TEST                                   ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
  // Step 1: Create simple test coin
  console.log('📦 Step 1: Creating simple test coin...\n');
  
  const ticker = `POOL${Date.now().toString().slice(-4)}`;
  
  execSync(`
    rm -rf /workspace/simple_test_coin
    mkdir -p /workspace/simple_test_coin/sources
    cat > /workspace/simple_test_coin/Move.toml <<'TOML'
[package]
name = "simple_test_coin"
version = "1.0.0"
edition = "2024.beta"
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
[addresses]
simple_test_coin = "0x0"
TOML

    cat > /workspace/simple_test_coin/sources/coin.move <<'MOVE'
module simple_test_coin::pooltest {
    use sui::coin::{Self};
    use sui::url;
    public struct POOLTEST has drop {}
    fun init(witness: POOLTEST, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"${ticker}", b"Pool Test",
            b"Testing Cetus pool creation",
            option::some(url::new_unsafe_from_bytes(b"https://test.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
MOVE
  `.replace('${ticker}', ticker));
  
  const publishOutput = execSync('cd /workspace/simple_test_coin && sui client publish --gas-budget 100000000 --json', { encoding: 'utf-8' });
  const publishData = JSON.parse(publishOutput);
  
  const pkg = publishData.objectChanges.find((o: any) => o.type === 'published');
  const treasury = publishData.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('TreasuryCap'));
  const metadata = publishData.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('CoinMetadata'));
  
  const coinType = `${pkg.packageId}::pooltest::POOLTEST`;
  
  console.log(`   ✅ Coin created: ${ticker}`);
  console.log(`   ✅ Type: ${coinType}`);
  console.log(`   ✅ Metadata: ${metadata.objectId}`);
  console.log(`   ✅ Treasury: ${treasury.objectId}\n`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 2: Mint some test coins
  console.log('💰 Step 2: Minting test coins...\n');
  
  const mintTx = new Transaction();
  const testCoin = mintTx.moveCall({
    target: '0x2::coin::mint',
    typeArguments: [coinType],
    arguments: [
      mintTx.object(treasury.objectId),
      mintTx.pure.u64(1_000_000_000_000_000), // 1M tokens
    ],
  });
  mintTx.transferObjects([testCoin], keypair.getPublicKey().toSuiAddress());
  mintTx.setGasBudget(50_000_000);
  
  const mintRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: mintTx,
    options: { showEffects: true },
  });
  
  console.log(`   ✅ Minted 1M ${ticker}\n`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 3: Mint SUILFG
  console.log('💰 Step 3: Minting SUILFG...\n');
  
  const suilfgTx = new Transaction();
  suilfgTx.moveCall({
    target: '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::admin_mint',
    arguments: [
      suilfgTx.object(FAUCET),
      suilfgTx.object(ADMIN_CAP),
      suilfgTx.pure.u64(10_000_000_000_000), // 10K SUILFG
    ],
  });
  suilfgTx.setGasBudget(50_000_000);
  
  const suilfgRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: suilfgTx,
    options: { showObjectChanges: true },
  });
  
  console.log(`   ✅ Minted 10K SUILFG\n`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 4: Get coin objects
  console.log('🔍 Step 4: Finding coin objects...\n');
  
  const objects = await client.getOwnedObjects({
    owner: keypair.getPublicKey().toSuiAddress(),
    options: { showType: true, showContent: true },
  });
  
  let testCoinObj = null;
  let suilfgCoinObj = null;
  
  for (const obj of objects.data) {
    const type = obj.data?.type || '';
    if (type.includes(coinType)) {
      testCoinObj = obj.data.objectId;
      console.log(`   ✅ Found ${ticker}: ${testCoinObj}`);
    }
    if (type.includes('SUILFG_MEMEFI') && type.includes('Coin<')) {
      suilfgCoinObj = obj.data.objectId;
      console.log(`   ✅ Found SUILFG: ${suilfgCoinObj}`);
    }
  }
  
  console.log('');
  
  if (!testCoinObj || !suilfgCoinObj) {
    console.log('❌ Could not find coins!');
    return;
  }
  
  // Step 5: Try to create Cetus pool
  console.log('🏊 Step 5: Creating Cetus pool...\n');
  
  console.log('   Parameters:');
  console.log(`   - Coin A: SUILFG_MEMEFI`);
  console.log(`   - Coin B: ${ticker}`);
  console.log(`   - Tick spacing: 200 (wider for test)`);
  console.log(`   - Initial price: 1:1\n`);
  
  // Calculate sqrt price for 1:1
  const SQRT_PRICE_1_TO_1 = '18446744073709551616';
  
  const poolTx = new Transaction();
  
  // Use pool_creator::create_pool_v2
  const [positionNFT, refundA, refundB] = poolTx.moveCall({
    target: `${CETUS_PKG}::pool_creator::create_pool_v2`,
    typeArguments: [SUILFG_TYPE, coinType],
    arguments: [
      poolTx.object(CETUS_CONFIG),
      poolTx.object(CETUS_POOLS),
      poolTx.pure.u32(200), // tick_spacing (trying 200 instead of 60)
      poolTx.pure.u128(SQRT_PRICE_1_TO_1), // initialize_sqrt_price
      poolTx.pure.string('Test Pool'),
      poolTx.pure.u32(4295048), // tick_lower (full range for 200 spacing)
      poolTx.pure.u32(4295848), // tick_upper (full range for 200 spacing)
      poolTx.object(suilfgCoinObj), // coin_a
      poolTx.object(testCoinObj), // coin_b
      poolTx.object(SUILFG_METADATA),
      poolTx.object(metadata.objectId),
      poolTx.pure.bool(false), // fix_amount_a
      poolTx.object(CLOCK),
    ],
  });
  
  // Transfer back refunds
  poolTx.transferObjects([refundA, refundB], keypair.getPublicKey().toSuiAddress());
  
  // Burn the position NFT (we don't need it for this test)
  poolTx.transferObjects([positionNFT], keypair.getPublicKey().toSuiAddress());
  
  poolTx.setGasBudget(500_000_000);
  
  console.log('🚀 Executing pool creation...\n');
  
  try {
    const poolRes = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: poolTx,
      options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });
    
    console.log(`📋 TX: ${poolRes.digest}`);
    console.log(`Status: ${poolRes.effects?.status?.status}\n`);
    
    if (poolRes.effects?.status?.status === 'success') {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 SUCCESS! CETUS POOL CREATED!                            ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
      
      console.log('✅ Pools address works perfectly!');
      console.log('✅ Pool creation successful!\n');
      
      console.log('📦 Created objects:');
      for (const obj of poolRes.objectChanges || []) {
        if (obj.type === 'created') {
          const name = obj.objectType?.split('::').pop() || 'Object';
          console.log(`   ${name}: ${obj.objectId}`);
        }
      }
      
      console.log('\n🎯 Now we know the exact parameters that work!');
      console.log('   Can apply this to bonding curve pool creation.');
      
    } else {
      console.log('❌ Pool creation failed!');
      console.log(`   Error: ${poolRes.effects?.status?.error}\n`);
      
      // Parse the error
      const errorStr = poolRes.effects?.status?.error || '';
      
      if (errorStr.includes('new_pool_key') && errorStr.includes('0x6')) {
        console.log('💡 Error Analysis:');
        console.log('   Cetus factory::new_pool_key abort 0x6');
        console.log('   This is likely E_POOL_ALREADY_EXISTS');
        console.log('   Or invalid fee tier / tick spacing');
        console.log('');
        console.log('   Let me try different parameters...');
      }
    }
    
  } catch (e: any) {
    console.log('❌ Transaction error:', e.message);
  }
}

main().catch(console.error);
