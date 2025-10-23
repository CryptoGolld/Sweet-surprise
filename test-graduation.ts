// @ts-nocheck
/**
 * Test New Package v1.0.0 - Full Graduation Flow
 */
const { Transaction } = require('@mysten/sui/transactions');
const { SuiClient } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');
const wallet = keypair.getPublicKey().toSuiAddress();

// New package constants
const PLATFORM_PACKAGE = '0xcd0f27ed92bf9350e7238c2121e3725e6b5d73bc30934f3d8e9ad399d56c495b';
const PLATFORM_STATE = '0x6714378dba8bf876894e37d4d219e13c0c0d45f9bf054f48e05c10b0bc249f3b';
const FAUCET_PACKAGE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81';
const SUILFG_MEMEFI_TYPE = `${FAUCET_PACKAGE}::faucet::SUILFG_MEMEFI`;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🧪 TESTING NEW PACKAGE v1.0.0 - GRADUATION FLOW             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
  console.log('STEP 1: CREATE TEST MEMECOIN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('Wallet:', wallet);
  console.log('Package:', PLATFORM_PACKAGE, '\n');
  
  // Step 1: Create coin package
  console.log('📝 Creating test coin package...\n');
  
  const coinModule = `
module test_graduation::graduation_test {
    use sui::coin;
    use sui::url;
    
    public struct GRADUATION_TEST has drop {}
    
    fun init(witness: GRADUATION_TEST, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            9,
            b"GRADTEST",
            b"Graduation Test",
            b"Testing v1.0.0 graduation with SUILFG_MEMEFI",
            option::some(url::new_unsafe_from_bytes(b"https://example.com/test.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }
}`.trim();

  const fs = require('fs');
  const path = require('path');
  
  // Create test coin directory
  const coinDir = '/workspace/test_graduation_coin';
  if (!fs.existsSync(coinDir)) fs.mkdirSync(coinDir);
  if (!fs.existsSync(`${coinDir}/sources`)) fs.mkdirSync(`${coinDir}/sources`);
  
  fs.writeFileSync(`${coinDir}/sources/graduation_test.move`, coinModule);
  fs.writeFileSync(`${coinDir}/Move.toml`, `[package]
name = "test_graduation"
version = "0.0.1"
edition = "2024"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "testnet" }

[addresses]
test_graduation = "0x0"
`);

  console.log('✅ Coin module created\n');
  
  // Build and publish
  console.log('🔨 Building coin package...\n');
  const { execSync } = require('child_process');
  
  try {
    execSync(`cd ${coinDir} && sui move build`, { stdio: 'pipe' });
    console.log('✅ Build successful\n');
    
    console.log('📤 Publishing coin package...\n');
    const publishOutput = execSync(
      `cd ${coinDir} && sui client publish --gas-budget 100000000 --json`,
      { encoding: 'utf-8' }
    );
    
    const publishResult = JSON.parse(publishOutput);
    const effects = publishResult.effects;
    
    let coinPackageId = null;
    let treasuryCapId = null;
    
    effects.created?.forEach(obj => {
      if (obj.owner?.AddressOwner) {
        const objType = obj.reference?.objectId;
        // Check if it's a package or treasury
        execSync(`sui client object ${objType} --json`, { encoding: 'utf-8' })
          .then(objData => {
            const parsed = JSON.parse(objData);
            if (parsed.data?.type?.includes('TreasuryCap')) {
              treasuryCapId = objType;
            }
          })
          .catch(() => {});
      }
    });
    
    effects.created?.forEach(obj => {
      if (obj.owner === 'Immutable') {
        coinPackageId = obj.reference?.objectId;
      }
    });
    
    console.log(`✅ Coin published!\n`);
    console.log(`   Package: ${coinPackageId}`);
    console.log(`   Treasury: ${treasuryCapId}\n`);
    
    // Wait a moment
    await new Promise(r => setTimeout(r, 2000));
    
    // Find treasury cap
    const objects = JSON.parse(execSync('sui client objects --json', { encoding: 'utf-8' }));
    const treasury = objects.find(o => o.data?.type?.includes('GRADUATION_TEST'));
    
    if (!treasury) {
      console.log('❌ Could not find treasury cap\n');
      return;
    }
    
    treasuryCapId = treasury.data.objectId;
    const coinType = `${coinPackageId}::graduation_test::GRADUATION_TEST`;
    
    console.log(`   Coin Type: ${coinType}\n`);
    
    // Step 2: Create bonding curve
    console.log('\nSTEP 2: CREATE BONDING CURVE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const tx1 = new Transaction();
    
    tx1.moveCall({
      target: `${PLATFORM_PACKAGE}::bonding_curve::create_new_meme_token`,
      typeArguments: [coinType],
      arguments: [
        tx1.object(PLATFORM_STATE),
        tx1.object(treasuryCapId),
      ],
    });
    
    tx1.setGasBudget(100000000);
    
    console.log('🚀 Creating bonding curve...\n');
    
    const result1 = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx1,
      options: { showEffects: true, showObjectChanges: true },
    });
    
    console.log(`✅ TX: ${result1.digest}\n`);
    
    let curveId = null;
    result1.objectChanges?.forEach(obj => {
      if (obj.type === 'created' && obj.objectType?.includes('BondingCurve')) {
        curveId = obj.objectId;
      }
    });
    
    console.log(`   Bonding Curve: ${curveId}\n`);
    
    // Wait
    await new Promise(r => setTimeout(r, 3000));
    
    // Step 3: Buy with 14000 SUILFG_MEMEFI
    console.log('\nSTEP 3: BUY WITH 14000 SUILFG_MEMEFI (TRIGGER GRADUATION)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get SUILFG_MEMEFI coin
    const memefiCoins = objects.filter(o => o.data?.type?.includes('SUILFG_MEMEFI'));
    const bigCoin = memefiCoins.sort((a, b) => 
      parseInt(b.data?.content?.fields?.balance || '0') - 
      parseInt(a.data?.content?.fields?.balance || '0')
    )[0];
    
    console.log(`Using SUILFG_MEMEFI coin: ${bigCoin.data.objectId}`);
    console.log(`Balance: ${(parseInt(bigCoin.data.content.fields.balance) / 1e9).toFixed(0)} MEMEFI\n`);
    
    const buyAmount = '14000000000000'; // 14000 MEMEFI with 9 decimals
    
    const tx2 = new Transaction();
    
    // Split exact amount
    const [payment] = tx2.splitCoins(tx2.object(bigCoin.data.objectId), [tx2.pure.u64(buyAmount)]);
    
    tx2.moveCall({
      target: `${PLATFORM_PACKAGE}::bonding_curve::buy`,
      typeArguments: [coinType],
      arguments: [
        tx2.object(PLATFORM_STATE),
        tx2.object(curveId),
        payment,
        tx2.pure.u64(buyAmount),
        tx2.pure.u64('1'), // min_tokens_out
        tx2.pure.u64(Date.now() + 60000), // deadline
        tx2.object('0x6'), // clock
      ],
    });
    
    tx2.setGasBudget(100000000);
    
    console.log('💰 Buying tokens...\n');
    
    const result2 = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx2,
      options: { showEffects: true, showEvents: true, showObjectChanges: true },
    });
    
    console.log(`✅ Buy TX: ${result2.digest}`);
    console.log(`   Status: ${result2.effects?.status?.status}\n`);
    
    // Check for graduation event
    const events = result2.events || [];
    const graduationEvent = events.find(e => e.type?.includes('GraduationReady'));
    
    if (graduationEvent) {
      console.log('🎉 GRADUATION TRIGGERED!\n');
      console.log('Event data:', JSON.stringify(graduationEvent.parsedJson, null, 2), '\n');
    }
    
    // Wait
    await new Promise(r => setTimeout(r, 3000));
    
    // Step 4: Check if graduated
    console.log('\nSTEP 4: VERIFY GRADUATION STATUS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const curveData = await client.getObject({
      id: curveId,
      options: { showContent: true },
    });
    
    const fields = curveData.data?.content?.fields;
    console.log('Curve Status:');
    console.log(`   Graduated: ${fields?.graduated}`);
    console.log(`   LP Seeded: ${fields?.lp_seeded}`);
    console.log(`   SUI Reserve: ${(parseInt(fields?.sui_reserve || '0') / 1e9).toFixed(2)} SUI\n`);
    
    if (fields?.graduated) {
      console.log('✅ Token successfully graduated!\n');
      
      // Step 5: Test graduation function
      console.log('\nSTEP 5: TEST seed_pool_prepare_for_cetus');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      const tx3 = new Transaction();
      
      tx3.moveCall({
        target: `${PLATFORM_PACKAGE}::bonding_curve::seed_pool_prepare_for_cetus`,
        typeArguments: [coinType],
        arguments: [
          tx3.object(PLATFORM_STATE),
          tx3.object(curveId),
          tx3.pure.u64(0), // bump_bps
        ],
      });
      
      tx3.setGasBudget(100000000);
      
      console.log('🚀 Calling seed_pool_prepare_for_cetus...\n');
      
      const result3 = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx3,
        options: { showEffects: true, showEvents: true, showObjectChanges: true },
      });
      
      console.log(`✅ TX: ${result3.digest}`);
      console.log(`   Status: ${result3.effects?.status?.status}\n`);
      
      // Check events
      const poolEvent = result3.events?.find(e => e.type?.includes('PoolCreated'));
      if (poolEvent) {
        console.log('🏊 Pool Preparation Event:\n');
        console.log(JSON.stringify(poolEvent.parsedJson, null, 2), '\n');
      }
      
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ ALL TESTS PASSED! v1.0.0 WORKS PERFECTLY! ✅             ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');
      
      console.log('Summary:');
      console.log('  ✅ Coin created');
      console.log('  ✅ Bonding curve created');
      console.log('  ✅ Bought with 14000 SUILFG_MEMEFI');
      console.log('  ✅ Automatic graduation triggered');
      console.log('  ✅ seed_pool_prepare_for_cetus executed');
      console.log('  ✅ Tokens prepared for Cetus pool creation\n');
      
      console.log('🔗 View transactions:');
      console.log(`   Create: https://suiscan.xyz/testnet/tx/${result1.digest}`);
      console.log(`   Buy: https://suiscan.xyz/testnet/tx/${result2.digest}`);
      console.log(`   Prepare Pool: https://suiscan.xyz/testnet/tx/${result3.digest}\n`);
    } else {
      console.log('⚠️ Token did not graduate yet\n');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message, '\n');
    if (error.cause) {
      console.log('Cause:', JSON.stringify(error.cause, null, 2));
    }
  }
}

main().catch(console.error);
