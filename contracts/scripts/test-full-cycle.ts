import 'dotenv/config';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

// Platform v0.0.4 (FINAL FIXED VERSION)
const PLATFORM_PKG = '0x4aabaffae8ac9d6def5d450ddefe0604227fc6c31af93f4b5ac52469361ee05e';
const PLATFORM_CONFIG = process.env.PLATFORM_CONFIG!;
const TICKER_REGISTRY = process.env.TICKER_REGISTRY!;
const REFERRAL_REGISTRY = process.env.REFERRAL_REGISTRY!;

// MOON memecoin
const MOON_PKG = '0x99ebd40425f64de92c24f1444fa669642cbcb68563a81f15d9de1327f61bced0';
const MOON_COIN_TYPE = `${MOON_PKG}::moon_memefi::MOON_MEMEFI`;
const BONDING_CURVE = process.env.BONDING_CURVE || '0x9c7110233cdf27146dd8592181b1df826a0cc0fffb55cff163919c675920eed7';

// SUILFG_MEMEFI coin
const SUILFG_COIN = process.env.SUILFG_COIN || '0xde8fe1b3d1fbf97fb468f87853f8e8712dccce2c9aa68edaf4eeb9ce95a6d120';

const mnemonic = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

async function buyMOON() {
  console.log('🚀 BUYING 1000 SUILFG_MEMEFI worth of MOON...\n');
  
  const tx = new Transaction();
  
  // Buy MOON tokens
  tx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::buy`,
    typeArguments: [MOON_COIN_TYPE],
    arguments: [
      tx.object(PLATFORM_CONFIG),
      tx.object(BONDING_CURVE),
      tx.object(REFERRAL_REGISTRY),
      tx.object(SUILFG_COIN),
      tx.pure.u64(10_000_000_000_000), // max 10K (will use 1000)
      tx.pure.u64(1), // min tokens out
      tx.pure.u64(Date.now() + 300_000), // 5 min deadline
      tx.pure([], 'vector<address>'), // no referrer
      tx.object('0x6'), // Clock
    ],
  });
  
  tx.setGasBudget(100_000_000);
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showBalanceChanges: true,
      showObjectChanges: true,
    },
  });
  
  console.log('✅ Transaction:', result.digest);
  
  if (result.effects?.status?.status === 'success') {
    console.log('🎉 BUY SUCCESSFUL!\n');
    
    // Show balance changes
    const balanceChanges = result.balanceChanges || [];
    for (const change of balanceChanges) {
      if (change.coinType.includes('MOON')) {
        const amount = BigInt(change.amount);
        const formatted = Number(amount) / 1e9;
        console.log(`📊 MOON Received: ${formatted.toLocaleString()} tokens`);
        console.log(`   (${amount.toLocaleString()} smallest units)`);
        
        if (formatted > 900_000_000) {
          console.log('\n✅✅✅ SUCCESS! Got MILLIONS as expected!');
        } else {
          console.log(`\n❌❌❌ Still wrong! Expected ~970M, got ${formatted}`);
        }
      } else if (change.coinType.includes('suilfg_memefi')) {
        const amount = Math.abs(Number(change.amount)) / 1e9;
        console.log(`💰 SUILFG_MEMEFI Spent: ${amount.toLocaleString()} tokens`);
      }
    }
    
    return result;
  } else {
    console.error('❌ Transaction failed:', result.effects?.status);
    throw new Error('Buy failed');
  }
}

async function sellMOON(moonCoinId: string, amountToSell: bigint) {
  console.log(`\n🔄 SELLING ${Number(amountToSell) / 1e9} MOON tokens...\n`);
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::sell`,
    typeArguments: [MOON_COIN_TYPE],
    arguments: [
      tx.object(PLATFORM_CONFIG),
      tx.object(BONDING_CURVE),
      tx.object(REFERRAL_REGISTRY),
      tx.object(moonCoinId),
      tx.pure.u64(amountToSell),
      tx.pure.u64(1), // min SUI out
      tx.pure.u64(Date.now() + 300_000),
      tx.pure([], 'vector<address>'), // no referrer
      tx.object('0x6'), // Clock
    ],
  });
  
  tx.setGasBudget(100_000_000);
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showBalanceChanges: true,
    },
  });
  
  console.log('✅ Transaction:', result.digest);
  
  if (result.effects?.status?.status === 'success') {
    console.log('🎉 SELL SUCCESSFUL!\n');
    
    const balanceChanges = result.balanceChanges || [];
    for (const change of balanceChanges) {
      if (change.coinType.includes('suilfg_memefi') && !change.coinType.includes('::sui::')) {
        const amount = Number(change.amount) / 1e9;
        console.log(`💰 SUILFG_MEMEFI Received: ${amount.toLocaleString()} tokens`);
      }
    }
  } else {
    console.error('❌ Sell failed:', result.effects?.status);
  }
}

// Run test
console.log('===================================================');
console.log('🧪 TESTING FIXED BONDING CURVE');
console.log('===================================================\n');
console.log(`Platform: ${PLATFORM_PKG}`);
console.log(`Memecoin: MOON (${MOON_COIN_TYPE})`);
console.log(`Bonding Curve: ${BONDING_CURVE}\n`);

buyMOON()
  .then(async (buyResult) => {
    // Find MOON coin from object changes
    const moonCoin = buyResult.objectChanges?.find(
      (c) => c.type === 'created' && 'objectType' in c && c.objectType?.includes('MOON')
    );
    
    if (moonCoin && 'objectId' in moonCoin) {
      // Sell half
      await sellMOON(moonCoin.objectId, 500_000_000_000_000_000n); // 500M MOON
    }
    
    console.log('\n===================================================');
    console.log('✅ FULL CYCLE TEST COMPLETE!');
    console.log('===================================================');
  })
  .catch(console.error);
