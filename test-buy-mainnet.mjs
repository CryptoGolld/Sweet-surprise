/**
 * Test Mainnet Buy - Find Working Solution
 * Using actual wallet with 0.5 SUI to buy 0.3 SUI worth
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

async function testApproach(name, buildTx) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log('='.repeat(60));
  
  try {
    const tx = await buildTx();
    
    console.log('Running dry run...');
    tx.setSender(address);
    const dryRun = await client.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client }),
    });
    
    if (dryRun.effects.status.status === 'success') {
      console.log('✅ DRY RUN SUCCESS!');
      console.log('Gas:', {
        computation: dryRun.effects.gasUsed.computationCost,
        storage: dryRun.effects.gasUsed.storageCost,
        total: (Number(dryRun.effects.gasUsed.computationCost) + Number(dryRun.effects.gasUsed.storageCost)) / 1e9,
      });
      
      console.log('\n🚀 Executing REAL transaction...');
      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
      });
      
      console.log('🎉 SUCCESS!');
      console.log('Digest:', result.digest);
      console.log('Explorer:', `https://suiscan.xyz/mainnet/tx/${result.digest}`);
      return true;
      
    } else {
      console.log('❌ DRY RUN FAILED');
      console.log('Error:', dryRun.effects.status.error || dryRun.effects.status);
      return false;
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Mainnet Buy Test - Finding Working Solution\n');
  console.log('Wallet:', address);
  
  // Get coins
  const { data: coins } = await client.getCoins({
    owner: address,
    coinType: '0x2::sui::SUI',
  });
  
  console.log(`\nFound ${coins.length} SUI coins:`);
  const total = coins.reduce((s, c) => s + BigInt(c.balance), 0n);
  coins.forEach((c, i) => {
    console.log(`  #${i}: ${Number(c.balance) / 1e9} SUI`);
  });
  console.log(`Total: ${Number(total) / 1e9} SUI`);
  
  const buyAmount = 300_000_000; // 0.3 SUI in MIST
  const deadline = Date.now() + 30 * 60 * 1000;
  
  // APPROACH 1: Merge all, split payment (simplest)
  const success1 = await testApproach('Merge All → Split Payment', async () => {
    const tx = new Transaction();
    
    let merged = tx.object(coins[0].coinObjectId);
    if (coins.length > 1) {
      tx.mergeCoins(merged, coins.slice(1).map(c => tx.object(c.coinObjectId)));
    }
    
    const [payment] = tx.splitCoins(merged, [buyAmount]);
    
    tx.moveCall({
      target: `${PLATFORM_PACKAGE}::bonding_curve::buy`,
      typeArguments: [COIN_TYPE],
      arguments: [
        tx.object(PLATFORM_STATE),
        tx.object(CURVE_ID),
        tx.object(REFERRAL_REGISTRY),
        payment,
        buyAmount,
        1,
        deadline,
        tx.pure(bcs.option(bcs.Address).serialize(null)),
        tx.object('0x6'),
      ],
    });
    
    return tx;
  });
  
  if (success1) {
    console.log('\n✅ APPROACH 1 WORKS! Implementing in codebase...');
    return;
  }
  
  // APPROACH 2: Don't split, pass full coin
  const success2 = await testApproach('Pass Full Merged Coin (no split)', async () => {
    const tx = new Transaction();
    
    let merged = tx.object(coins[0].coinObjectId);
    if (coins.length > 1) {
      tx.mergeCoins(merged, coins.slice(1).map(c => tx.object(c.coinObjectId)));
    }
    
    tx.moveCall({
      target: `${PLATFORM_PACKAGE}::bonding_curve::buy`,
      typeArguments: [COIN_TYPE],
      arguments: [
        tx.object(PLATFORM_STATE),
        tx.object(CURVE_ID),
        tx.object(REFERRAL_REGISTRY),
        merged, // Pass whole merged coin
        buyAmount,
        1,
        deadline,
        tx.pure(bcs.option(bcs.Address).serialize(null)),
        tx.object('0x6'),
      ],
    });
    
    return tx;
  });
  
  if (success2) {
    console.log('\n✅ APPROACH 2 WORKS! Implementing in codebase...');
    return;
  }
  
  console.log('\n❌ Both approaches failed!');
}

main().catch(console.error);
