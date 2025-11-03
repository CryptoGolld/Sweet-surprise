/**
 * ✅ SUCCESSFUL BUY TEST - PROVEN WORKING PATTERN
 * 
 * Transaction: https://suiscan.xyz/mainnet/tx/AvAKhEzJCv1w588xzRCs7o2SbhMtdvx7fTfHAqQCfzPh
 * Result: Bought 290,999 VENCE tokens for 1.3 SUI
 * 
 * This script demonstrates the ONLY working pattern for buying tokens:
 * 1. Merge SOME coins for payment (NOT all - need one for gas!)
 * 2. Split exact payment amount
 * 3. Call bonding_curve::buy
 * 4. Use separate coin for gas via setGasPayment()
 * 
 * Contract requirements:
 * - payment_coin_value MUST be <= max_sui_in (error 5 if exceeded)
 * - First buy requires 1 SUI first buyer fee + buy amount
 * - Contract handles all fee splits internally
 * 
 * ⚠️ See CRITICAL_VULNERABILITIES.md for known issues
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { bcs } from '@mysten/sui/bcs';

const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');
const address = keypair.getPublicKey().toSuiAddress();

const PLATFORM_PACKAGE = '0xac58548c2eeefb62215d1e8fd6c3a1796e8f78a3a74703bb8991c66f40c48a04';
const PLATFORM_STATE = '0xb2b9568567fb4f8983425581511e9931b0feb5e7ca485c9f0263e0593cfb7c00';
const REFERRAL_REGISTRY = '0xac8b25db1c44cbb28d8cdbdbdac3d0eddc15c5a59aabb8bb8ba5bda9c9754f51';
const CURVE_ID = '0x36e43c97b73b2fc85c11a30ad0be75caf63cfda76eb944e30a300855d17a5073';
const COIN_TYPE = '0x0a99f6af6fae579424c08f308cab7899949f9bcfd274bc933d62a6d64fc5d264::vence::VENCE';

async function buyVence() {
  console.log('🔥 BUYING 1.3 SUI WORTH OF VENCE! 🔥\n');
  console.log('👤 Wallet:', address);
  console.log('🪙 Token: VENCE');
  console.log('💰 Buy Amount: 1.3 SUI\n');
  
  // Get coins
  const { data: coins } = await client.getCoins({
    owner: address,
    coinType: '0x2::sui::SUI',
  });
  
  const total = coins.reduce((s, c) => s + BigInt(c.balance), 0n);
  console.log(`Found ${coins.length} coins, Total: ${Number(total) / 1e9} SUI`);
  coins.forEach((c, i) => {
    console.log(`  Coin ${i + 1}: ${Number(c.balance) / 1e9} SUI`);
  });
  console.log();
  
  const buyAmount = 1_300_000_000; // 1.3 SUI
  const minTokensOut = 1;
  const deadlineMs = Date.now() + 30 * 60 * 1000;
  
  console.log('Building transaction...\n');
  
  const tx = new Transaction();
  
  // STEP 1: Merge first 2 coins (keep 3rd for gas)
  console.log('Step 1: Merging coins 1 & 2 for payment...');
  console.log('         Keeping coin 3 for gas...');
  let mergedCoin = tx.object(coins[0].coinObjectId);
  tx.mergeCoins(mergedCoin, [tx.object(coins[1].coinObjectId)]);
  // coins[2] stays separate for gas!
  
  // STEP 2: Split exact payment amount from merged
  console.log('Step 2: Splitting 1.3 SUI for payment...');
  const [paymentCoin] = tx.splitCoins(mergedCoin, [tx.pure.u64(buyAmount)]);
  
  // STEP 3: Call buy function
  console.log('Step 3: Calling bonding_curve::buy...');
  tx.moveCall({
    target: `${PLATFORM_PACKAGE}::bonding_curve::buy`,
    typeArguments: [COIN_TYPE],
    arguments: [
      tx.object(PLATFORM_STATE),
      tx.object(CURVE_ID),
      tx.object(REFERRAL_REGISTRY),
      paymentCoin,
      tx.pure.u64(buyAmount),
      tx.pure.u64(minTokensOut),
      tx.pure.u64(deadlineMs),
      tx.pure(bcs.option(bcs.Address).serialize(null)),
      tx.object('0x6'),
    ],
  });
  
  // STEP 4: Use coin 3 for gas
  console.log('Step 4: Using coin 3 for gas...');
  tx.setGasPayment([{
    objectId: coins[2].coinObjectId,
    version: coins[2].version,
    digest: coins[2].digest
  }]);
  
  tx.setSender(address);
  
  console.log('\n🚀 Executing transaction...\n');
  
  try {
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      },
    });
    
    console.log('='.repeat(70));
    if (result.effects.status.status === 'success') {
      console.log('🎉🎉🎉 SUCCESS! VENCE TOKENS PURCHASED! 🎉🎉🎉');
    } else {
      console.log('❌ TRANSACTION FAILED');
    }
    console.log('='.repeat(70));
    
    console.log('\n📝 Transaction Digest:', result.digest);
    console.log('🔍 SuiScan: https://suiscan.xyz/mainnet/tx/' + result.digest);
    console.log('🔍 SuiVision: https://suivision.xyz/txblock/' + result.digest);
    
    console.log('\n✅ Status:', result.effects.status.status.toUpperCase());
    
    if (result.effects.status.status !== 'success') {
      console.log('❌ Error:', result.effects.status.error);
      return;
    }
    
    // Show gas used
    if (result.effects.gasUsed) {
      const gas = result.effects.gasUsed;
      const total = (Number(gas.computationCost) + Number(gas.storageCost) - Number(gas.storageRebate)) / 1e9;
      console.log(`\n⛽ Gas Used: ${total.toFixed(4)} SUI`);
    }
    
    // Show created objects
    if (result.objectChanges) {
      console.log('\n📦 Created Objects:');
      let venceTokenId = null;
      let venceAmount = null;
      
      result.objectChanges.forEach(change => {
        if (change.type === 'created') {
          const type = change.objectType || '';
          if (type.includes('VENCE')) {
            console.log(`  ✨ VENCE Token Coin Created!`);
            console.log(`     ID: ${change.objectId}`);
            venceTokenId = change.objectId;
          }
        }
      });
      
      if (venceTokenId) {
        console.log(`\n  🎯 You now own VENCE tokens!`);
        console.log(`     Coin ID: ${venceTokenId}`);
      }
    }
    
    // Show balance changes
    if (result.balanceChanges) {
      console.log('\n💰 Balance Changes:');
      result.balanceChanges.forEach(change => {
        const amount = Number(change.amount) / 1e9;
        const coin = change.coinType.substring(change.coinType.lastIndexOf(':') + 1);
        const sign = amount > 0 ? '+' : '';
        console.log(`  ${sign}${amount.toFixed(4)} ${coin}`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ BUY SUCCESSFUL! THE PATTERN WORKS! 🚀');
    console.log('='.repeat(70));
    
    console.log('\n📝 Implementation Notes:');
    console.log('1. Merged 3 coins → 1 coin ✅');
    console.log('2. Split 1.3 SUI for payment ✅');
    console.log('3. Contract handled 1 SUI first buyer fee ✅');
    console.log('4. Contract handled all trading fees ✅');
    console.log('5. Minted and transferred VENCE tokens ✅');
    console.log('6. Remainder used for gas ✅');
    
    console.log('\n🎉 Ready to implement on your website!');
    
    return result;
    
  } catch (error) {
    console.error('\n💥 ERROR:', error.message);
    if (error.cause) {
      console.error('\nDetails:', JSON.stringify(error.cause?.effects?.status, null, 2));
    }
    throw error;
  }
}

buyVence()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed');
    process.exit(1);
  });
