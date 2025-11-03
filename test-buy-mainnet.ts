/**
 * Test buy transaction on mainnet
 * Wallet: royal stairs eye dizzy response educate fire edge smooth cruise skill say
 * Buy 0.3 SUI worth of tokens
 */

// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const NETWORK = 'mainnet';
const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

// Contract addresses from your platform
const PLATFORM_PACKAGE = '0xac58548c2eeefb62215d1e8fd6c3a1796e8f78a3a74703bb8991c66f40c48a04';
const PLATFORM_STATE = '0xb2b9568567fb4f8983425581511e9931b0feb5e7ca485c9f0263e0593cfb7c00';
const REFERRAL_REGISTRY = '0xac8b25db1c44cbb28d8cdbdbdac3d0eddc15c5a59aabb8bb8ba5bda9c9754f51';

// Curve and coin info
const CURVE_ID = '0x36e43c97b73b2fc85c11a30ad0be75caf63cfda76eb944e30a300855d17a5073';
const COIN_TYPE = '0x0a99f6af6fae579424c08f308cab7899949f9bcfd274bc933d62a6d64fc5d264::vence::VENCE';
const CLOCK = '0x6';

const BUY_AMOUNT_SUI = 0.3;
const BUY_AMOUNT_MIST = BigInt(BUY_AMOUNT_SUI * 1_000_000_000); // 300,000,000 MIST

console.log('🔍 Test Buy on Mainnet');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('Wallet:', keypair.toSuiAddress());
console.log('Network:', NETWORK);
console.log('Curve ID:', CURVE_ID);
console.log('Coin Type:', COIN_TYPE);
console.log('Buy Amount:', BUY_AMOUNT_SUI, 'SUI');
console.log('Buy Amount (MIST):', BUY_AMOUNT_MIST.toString());
console.log('');

async function testBuy() {
  try {
    // Step 1: Get wallet balance and coins
    console.log('📊 Step 1: Checking wallet balance...\n');
    const coins = await client.getCoins({
      owner: keypair.toSuiAddress(),
      coinType: '0x2::sui::SUI',
    });

    if (coins.data.length === 0) {
      throw new Error('No SUI coins found in wallet');
    }

    const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    console.log(`   Balance: ${Number(totalBalance) / 1e9} SUI`);
    console.log(`   Coin objects: ${coins.data.length}`);
    console.log('');

    if (totalBalance < BUY_AMOUNT_MIST) {
      throw new Error(`Insufficient balance. Need ${BUY_AMOUNT_MIST}, have ${totalBalance}`);
    }

    // Step 2: Build transaction - EXACT SAME AS FRONTEND
    console.log('🔨 Step 2: Building transaction...\n');
    
    const tx = new Transaction();
    
    // Deadline: Use very large buffer to test if deadline is the issue
    // Try getting blockchain time first, then add buffer
    console.log('   Getting blockchain clock time...');
    let blockchainTime: bigint;
    try {
      const clock = await client.getObject({ id: '0x6' });
      const clockFields = clock.data?.content?.fields as any;
      blockchainTime = BigInt(clockFields.timestamp_ms || Date.now());
      console.log(`   Blockchain time (MS): ${blockchainTime.toString()}`);
      console.log(`   Client time (MS): ${Date.now()}`);
      console.log(`   Difference: ${Number(blockchainTime - BigInt(Date.now()))}ms`);
    } catch (e) {
      console.log('   Could not get clock, using client time');
      blockchainTime = BigInt(Date.now());
    }
    
    // Use blockchain time + 24 hour buffer to be absolutely sure
    const deadlineMs = Number(blockchainTime) + 86400000; // 24 hours from blockchain time
    console.log(`   Deadline MS: ${deadlineMs} (${new Date(deadlineMs).toISOString()})`);
    console.log(`   Deadline is ${(deadlineMs - Number(blockchainTime)) / 1000 / 60} minutes in the future`);
    console.log('');

    // Merge coins if multiple
    let mergedCoin = tx.object(coins.data[0].coinObjectId);
    if (coins.data.length > 1) {
      console.log(`   Merging ${coins.data.length} coins...`);
      const rest = coins.data.slice(1).map(c => tx.object(c.coinObjectId));
      tx.mergeCoins(mergedCoin, rest);
    } else {
      console.log('   Single coin, no merge needed');
    }

    // Split payment amount
    console.log(`   Splitting ${BUY_AMOUNT_MIST.toString()} MIST for payment...`);
    const [paymentCoin] = tx.splitCoins(mergedCoin, [
      tx.pure.u64(BUY_AMOUNT_MIST.toString())
    ]);
    console.log('');

    // Build moveCall - EXACT SAME AS FRONTEND
    console.log('🔨 Step 3: Building moveCall...\n');
    console.log('   Target:', `${PLATFORM_PACKAGE}::bonding_curve::buy`);
    console.log('   Arguments:');
    console.log('     - state:', PLATFORM_STATE);
    console.log('     - curve:', CURVE_ID);
    console.log('     - referralRegistry:', REFERRAL_REGISTRY);
    console.log('     - paymentCoin: (split coin)');
    console.log('     - maxSuiIn:', BUY_AMOUNT_MIST.toString());
    console.log('     - minTokensOut: 0');
    console.log('     - deadline:', deadlineMs);
    console.log('     - referrer: null');
    console.log('     - clock:', CLOCK);
    console.log('');

    tx.moveCall({
      target: `${PLATFORM_PACKAGE}::bonding_curve::buy`,
      typeArguments: [COIN_TYPE],
      arguments: [
        tx.object(PLATFORM_STATE),
        tx.object(CURVE_ID),
        tx.object(REFERRAL_REGISTRY),
        paymentCoin,
        tx.pure.u64(BUY_AMOUNT_MIST.toString()),
        tx.pure.u64('0'),
        tx.pure.u64(deadlineMs),
        tx.pure(bcs.option(bcs.Address).serialize(null)), // No referrer
        tx.object(CLOCK),
      ],
    });

    // Step 3: Dry run first (same as frontend now does)
    console.log('🧪 Step 4: Performing dry run...\n');
    tx.setSender(keypair.toSuiAddress());
    const dryRunBytes = await tx.build({ client });
    
    const dryRunResult = await client.dryRunTransactionBlock({
      transactionBlock: dryRunBytes,
    });

    console.log('   Dry run status:', dryRunResult.effects?.status?.status);
    
    if (dryRunResult.effects?.status?.status !== 'success') {
      const error = dryRunResult.effects?.status?.error;
      console.log('   ❌ DRY RUN FAILED!');
      console.log('   Error:', error);
      console.log('   Full effects:', JSON.stringify(dryRunResult.effects, null, 2));
      throw new Error(`Dry run failed: ${error}`);
    }

    console.log('   ✅ Dry run successful!');
    console.log('   Gas used:', {
      computation: dryRunResult.effects?.gasUsed?.computationCost,
      storage: dryRunResult.effects?.gasUsed?.storageCost,
      storageRebate: dryRunResult.effects?.gasUsed?.storageRebate,
    });
    console.log('');

    // Step 4: Execute transaction
    console.log('💸 Step 5: Executing transaction...\n');
    
    // Create fresh transaction for signing (dry run modified original)
    const txForSigning = new Transaction();
    let mergedCoin2 = txForSigning.object(coins.data[0].coinObjectId);
    if (coins.data.length > 1) {
      const rest = coins.data.slice(1).map(c => txForSigning.object(c.coinObjectId));
      txForSigning.mergeCoins(mergedCoin2, rest);
    }
    const [paymentCoin2] = txForSigning.splitCoins(mergedCoin2, [
      txForSigning.pure.u64(BUY_AMOUNT_MIST.toString())
    ]);

    txForSigning.moveCall({
      target: `${PLATFORM_PACKAGE}::bonding_curve::buy`,
      typeArguments: [COIN_TYPE],
      arguments: [
        txForSigning.object(PLATFORM_STATE),
        txForSigning.object(CURVE_ID),
        txForSigning.object(REFERRAL_REGISTRY),
        paymentCoin2,
        txForSigning.pure.u64(BUY_AMOUNT_MIST.toString()),
        txForSigning.pure.u64('0'),
        txForSigning.pure.u64(Number(blockchainTime) + 86400000), // 24 hours from blockchain time
        txForSigning.pure(bcs.option(bcs.Address).serialize(null)),
        txForSigning.object(CLOCK),
      ],
    });

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txForSigning,
      options: {
        showEffects: true,
        showBalanceChanges: true,
        showObjectChanges: true,
      },
    });

    console.log('   ✅ Transaction executed successfully!');
    console.log('   Digest:', result.digest);
    console.log('   Status:', result.effects?.status?.status);
    console.log('');

    // Check balance changes
    if (result.balanceChanges && result.balanceChanges.length > 0) {
      console.log('💰 Balance Changes:');
      result.balanceChanges.forEach(change => {
        const amount = Number(change.amount) / 1e9;
        const coinName = change.coinType.split('::').pop();
        console.log(`   ${amount >= 0 ? '+' : ''}${amount.toFixed(9)} ${coinName}`);
      });
    }

    console.log('\n✅ Buy transaction completed successfully!');
    console.log(`\nView on explorer: https://suiexplorer.com/txblock/${result.digest}?network=${NETWORK}`);

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    if (error.stack) {
      console.error('\nStack:', error.stack);
    }
    process.exit(1);
  }
}

testBuy();
