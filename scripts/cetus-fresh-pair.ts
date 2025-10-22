// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { execSync } from 'child_process';

const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');
const wallet = keypair.getPublicKey().toSuiAddress();

console.log('🎯 Testing Cetus SDK with FRESH coin pair\n');

async function main() {
  // Create a brand new coin
  const ticker = `CTEST${Date.now().toString().slice(-4)}`;
  
  console.log(`Creating test coin: ${ticker}...\n`);
  
  execSync(`
    rm -rf /workspace/cetus_test_coin
    mkdir -p /workspace/cetus_test_coin/sources
    cat > /workspace/cetus_test_coin/Move.toml <<'TOML'
[package]
name = "cetus_test_coin"
version = "1.0.0"
edition = "2024.beta"
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
[addresses]
cetus_test_coin = "0x0"
TOML
    cat > /workspace/cetus_test_coin/sources/coin.move <<'MOVE'
module cetus_test_coin::ctest {
    use sui::coin::{Self};
    public struct CTEST has drop {}
    fun init(witness: CTEST, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness, 9, b"${ticker}", b"Cetus Test", b"Test",
            option::none(), ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }
}
MOVE
  `.replace('${ticker}', ticker));
  
  const publishOutput = execSync('cd /workspace/cetus_test_coin && sui client publish --gas-budget 100000000 --json 2>&1 | grep -v "warning\\|note\\|Branch\\|UPDATING"', { encoding: 'utf-8' });
  
  const jsonMatch = publishOutput.match(/\{[\s\S]*"digest"[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('Could not parse publish output');
    return;
  }
  
  const publishData = JSON.parse(jsonMatch[0]);
  const pkg = publishData.objectChanges.find((o: any) => o.type === 'published');
  const coinType = `${pkg.packageId}::ctest::CTEST`;
  
  console.log(`✅ Coin created: ${coinType}\n`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Initialize SDK
  const sdk = initCetusSDK({
    network: 'testnet',
    wallet: wallet,
  });
  
  console.log('✅ Cetus SDK initialized\n');
  
  // Use SUI instead of SUILFG (to avoid any SUILFG-specific issues)
  const SUI_TYPE = '0x2::sui::SUI';
  
  console.log(`Creating pool: SUI / ${ticker}\n`);
  
  try {
    const payload = await sdk.Pool.createPoolTransactionPayload({
      coinTypeA: SUI_TYPE,
      coinTypeB: coinType,
      tick_spacing: 200, // 1% fee (wider spacing)
      initialize_sqrt_price: '18446744073709551616',
      uri: '',
    });
    
    console.log('✅ Payload created!\n');
    
    const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: payload,
      options: { showEffects: true, showObjectChanges: true },
    });
    
    console.log(`TX: ${result.digest}`);
    console.log(`Status: ${result.effects?.status?.status}\n`);
    
    if (result.effects?.status?.status === 'success') {
      console.log('🎉🎉🎉 POOL CREATED!!! 🎉🎉🎉\n');
      
      for (const obj of result.objectChanges || []) {
        if (obj.type === 'created' && obj.objectType?.includes('Pool')) {
          console.log(`Pool: ${obj.objectId}\n`);
        }
      }
      
      console.log('✅ Cetus SDK WORKS!');
      console.log('✅ Ready to integrate!\n');
      
    } else {
      console.log(`Failed: ${result.effects?.status?.error}`);
    }
    
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }
}

main().catch(console.error);
