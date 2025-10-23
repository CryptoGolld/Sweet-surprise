/**
 * Test script to debug sell transaction
 * Run with: npx tsx test-sell-transaction.ts
 */

import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';

// Fill these in:
const SEED_PHRASE = process.env.SEED_PHRASE || ''; // Pass as env var or fill here
const CURVE_ID = process.env.CURVE_ID || ''; // The bonding curve you want to sell to
const COIN_TYPE = process.env.COIN_TYPE || ''; // Full coin type like 0xPACKAGE::MODULE::STRUCT

// Contract addresses (from your constants)
const CONTRACTS = {
  PLATFORM_PACKAGE: '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047',
  PLATFORM_STATE: '0x7bf135f0a84ff2bbf9328e1a017b87fb4dcdcc221099f1d4799ba0d67de40a25',
  REFERRAL_REGISTRY: '0x5f554041e47bb6c07dd2214ce1e08c765515f326b6d471edfefc06e925d8e3bc',
};

async function main() {
  console.log('🔍 Starting sell transaction debug...\n');

  if (!SEED_PHRASE) {
    console.error('❌ Please provide SEED_PHRASE');
    console.log('Usage: SEED_PHRASE="your seed phrase" CURVE_ID="0x..." COIN_TYPE="0x...::module::Struct" npx tsx test-sell-transaction.ts');
    process.exit(1);
  }

  // Setup
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  const keypair = Ed25519Keypair.deriveKeypair(SEED_PHRASE);
  const address = keypair.toSuiAddress();

  console.log('📍 Address:', address);
  console.log('📦 Curve ID:', CURVE_ID || 'Not provided');
  console.log('🪙 Coin Type:', COIN_TYPE || 'Not provided');
  console.log('');

  // Get user's meme token balance
  console.log('📊 Fetching your token balance...');
  const coins = await client.getCoins({
    owner: address,
    coinType: COIN_TYPE || undefined,
  });

  console.log(`\n✅ Found ${coins.data.length} coin objects:`);
  let totalBalance = 0n;
  coins.data.forEach((coin, i) => {
    const balance = BigInt(coin.balance);
    totalBalance += balance;
    console.log(`  [${i}] ${coin.coinObjectId.slice(0, 20)}... = ${balance} (${Number(balance) / 1e9} tokens)`);
  });
  
  console.log(`\n💰 Total Balance: ${totalBalance} (${Number(totalBalance) / 1e9} tokens)`);

  if (coins.data.length === 0) {
    console.log('\n❌ No coins found. Cannot test sell.');
    return;
  }

  // Ask user how much to sell (or use 1% of balance for testing)
  const amountToSell = totalBalance / 100n; // Sell 1% for testing
  console.log(`\n🎯 Testing sell of: ${amountToSell} (${Number(amountToSell) / 1e9} tokens)`);

  if (amountToSell === 0n) {
    console.log('❌ Amount too small. Need at least 100 tokens to test.');
    return;
  }

  if (!CURVE_ID || !COIN_TYPE) {
    console.log('\n⚠️  To test the actual transaction, provide:');
    console.log('    CURVE_ID - the bonding curve object ID');
    console.log('    COIN_TYPE - the full coin type');
    console.log('\n💡 Example:');
    console.log('    SEED_PHRASE="..." CURVE_ID="0xabc..." COIN_TYPE="0x123::module::COIN" npx tsx test-sell-transaction.ts');
    return;
  }

  // Build the sell transaction
  console.log('\n🔨 Building sell transaction...');
  const tx = new Transaction();
  tx.setGasBudget(100_000_000);

  const deadlineMs = Date.now() + 300000;

  // Handle coin merging
  let coinArg;
  if (coins.data.length === 1) {
    console.log('  → Using single coin');
    coinArg = tx.object(coins.data[0].coinObjectId);
  } else {
    console.log(`  → Merging ${coins.data.length} coins`);
    const [first, ...rest] = coins.data;
    coinArg = tx.object(first.coinObjectId);
    const restObjects = rest.map(c => tx.object(c.coinObjectId));
    tx.mergeCoins(coinArg, restObjects);
  }

  console.log('  → Building moveCall with arguments:');
  console.log(`     - Platform State: ${CONTRACTS.PLATFORM_STATE}`);
  console.log(`     - Curve ID: ${CURVE_ID}`);
  console.log(`     - Referral Registry: ${CONTRACTS.REFERRAL_REGISTRY}`);
  console.log(`     - Coin: [merged coin]`);
  console.log(`     - Amount to sell: ${amountToSell}`);
  console.log(`     - Min SUI out: 0`);
  console.log(`     - Deadline: ${deadlineMs}`);
  console.log(`     - Referrer: null`);
  console.log(`     - Clock: 0x6`);

  tx.moveCall({
    target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::sell`,
    typeArguments: [COIN_TYPE],
    arguments: [
      tx.object(CONTRACTS.PLATFORM_STATE),
      tx.object(CURVE_ID),
      tx.object(CONTRACTS.REFERRAL_REGISTRY),
      coinArg,
      tx.pure.u64(amountToSell.toString()),
      tx.pure.u64('0'),
      tx.pure.u64(deadlineMs),
      tx.pure(bcs.option(bcs.Address).serialize(null).toBytes()),
      tx.object('0x6'),
    ],
  });

  console.log('\n📤 Executing transaction...');
  try {
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log('\n✅ SUCCESS!');
    console.log('Transaction Digest:', result.digest);
    console.log('Status:', result.effects?.status);
    console.log('\nView on explorer:');
    console.log(`https://suiscan.xyz/testnet/tx/${result.digest}`);
  } catch (error: any) {
    console.log('\n❌ TRANSACTION FAILED:');
    console.log(error.message || error);
    
    if (error.message) {
      // Parse the error to find the exact issue
      if (error.message.includes('InsufficientCoinBalance')) {
        console.log('\n💡 Issue: InsufficientCoinBalance');
        console.log('   The coin doesn\'t have enough balance for the split operation');
      } else if (error.message.includes('MovePrimitiveRuntimeError')) {
        console.log('\n💡 Issue: MovePrimitiveRuntimeError');
        console.log('   There\'s an error inside the Move function execution');
        
        // Check which instruction failed
        const match = error.message.match(/instruction: (\d+)/);
        if (match) {
          console.log(`   Failed at instruction: ${match[1]}`);
        }
      }
    }
    
    console.log('\n📋 Full error for debugging:');
    console.log(JSON.stringify(error, null, 2));
  }
}

main().catch(console.error);
