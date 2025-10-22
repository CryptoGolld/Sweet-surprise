// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { execSync } from 'child_process';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const CETUS_PKG = '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12';
const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2';

const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';
const CLOCK = '0x6';

console.log('🧪 SIMPLE CETUS POOL TEST - V2\n');

async function main() {
  // Create coin
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
            witness, 9, b"${ticker}", b"Pool Test", b"Test",
            option::some(url::new_unsafe_from_bytes(b"https://test.png")), ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
MOVE
  `.replace('${ticker}', ticker));
  
  const publishOutput = execSync('cd /workspace/simple_test_coin && sui client publish --gas-budget 100000000 --json 2>&1', { encoding: 'utf-8' });
  const publishData = JSON.parse(publishOutput);
  
  const pkg = publishData.objectChanges.find((o: any) => o.type === 'published');
  const treasury = publishData.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('TreasuryCap'));
  const metadata = publishData.objectChanges.find((o: any) => o.type === 'created' && o.objectType?.includes('CoinMetadata'));
  
  const coinType = `${pkg.packageId}::pooltest::POOLTEST`;
  
  console.log(`✅ Coin: ${coinType.split('::')[0].slice(0, 10)}...::${ticker}\n`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Mint and split coins properly
  console.log('💰 Minting coins for pool...\n');
  
  const mintTx = new Transaction();
  
  // Mint SUILFG
  const suilfgCoin = mintTx.moveCall({
    target: '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::admin_mint',
    arguments: [
      mintTx.object(FAUCET),
      mintTx.object(ADMIN_CAP),
      mintTx.pure.u64(10_000_000_000_000), // 10K SUILFG
    ],
  });
  
  // Mint test coin
  const testCoin = mintTx.moveCall({
    target: '0x2::coin::mint',
    typeArguments: [coinType],
    arguments: [
      mintTx.object(treasury.objectId),
      mintTx.pure.u64(1_000_000_000_000_000), // 1M tokens
    ],
  });
  
  mintTx.setGasBudget(100_000_000);
  
  const mintRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: mintTx,
    options: { showEffects: true },
  });
  
  console.log(`✅ Minted both coins\n`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Get the minted coin objects
  const objects = await client.getOwnedObjects({
    owner: keypair.getPublicKey().toSuiAddress(),
    options: { showType: true },
    filter: { MatchAny: [
      { StructType: `0x2::coin::Coin<${SUILFG_TYPE}>` },
      { StructType: `0x2::coin::Coin<${coinType}>` },
    ]},
  });
  
  let suilfgCoinId = null;
  let testCoinId = null;
  
  for (const obj of objects.data) {
    const type = obj.data?.type || '';
    if (type.includes(SUILFG_TYPE)) {
      suilfgCoinId = obj.data.objectId;
    }
    if (type.includes(coinType)) {
      testCoinId = obj.data.objectId;
    }
    if (suilfgCoinId && testCoinId) break;
  }
  
  console.log(`Found coins: SUILFG=${suilfgCoinId?.slice(0,8)}..., TEST=${testCoinId?.slice(0,8)}...\n`);
  
  // Create pool
  console.log('🏊 Creating Cetus pool...\n');
  
  const poolTx = new Transaction();
  
  const [positionNFT, refundA, refundB] = poolTx.moveCall({
    target: `${CETUS_PKG}::pool_creator::create_pool_v2`,
    typeArguments: [SUILFG_TYPE, coinType],
    arguments: [
      poolTx.object(CETUS_CONFIG),
      poolTx.object(CETUS_POOLS),
      poolTx.pure.u32(60), // tick_spacing
      poolTx.pure.u128('18446744073709551616'), // sqrt_price 1:1
      poolTx.pure.string('Test Pool'),
      poolTx.pure.u32(4294523), // tick_lower (full range for spacing 60)
      poolTx.pure.u32(4295323), // tick_upper
      poolTx.object(suilfgCoinId),
      poolTx.object(testCoinId),
      poolTx.object(SUILFG_METADATA),
      poolTx.object(metadata.objectId),
      poolTx.pure.bool(false),
      poolTx.object(CLOCK),
    ],
  });
  
  poolTx.transferObjects([positionNFT, refundA, refundB], keypair.getPublicKey().toSuiAddress());
  poolTx.setGasBudget(500_000_000);
  
  try {
    const poolRes = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: poolTx,
      options: { showEffects: true, showObjectChanges: true },
    });
    
    console.log(`TX: ${poolRes.digest}`);
    console.log(`Status: ${poolRes.effects?.status?.status}\n`);
    
    if (poolRes.effects?.status?.status === 'success') {
      console.log('🎉 SUCCESS! Cetus pool created!\n');
      
      for (const obj of poolRes.objectChanges || []) {
        if (obj.type === 'created' && obj.objectType?.includes('Pool')) {
          console.log(`Pool: ${obj.objectId}`);
        }
      }
      
      console.log('\n✅ Pools address works: ' + CETUS_POOLS);
      
    } else {
      console.log(`❌ Failed: ${poolRes.effects?.status?.error}`);
    }
    
  } catch (e: any) {
    console.log(`❌ Error: ${e.message}`);
  }
}

main().catch(console.error);
