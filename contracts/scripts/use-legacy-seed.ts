// @ts-nocheck
/**
 * Use legacy seed_pool_prepare which doesn't create Cetus pool directly
 * This function prepares LP tokens for manual pool creation
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const PLATFORM_PKG = '0x89e30287cbfd4bb53ea258146cbdac50165478b39020067f1adce731c9f41853';
const PLATFORM_CONFIG = '0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07';
const CURVE = '0xfb78d6b706a3e5cff8423422dcd530cd0fcceecfa2fd5b86a3e598e3362e1611';
const COIN_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  🏊 ALTERNATIVE: Using legacy pool seeding                  ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('ℹ️  Note: The new seed_pool_and_create_cetus_with_lock function');
console.log('   requires a Cetus Pools object that doesn\'t exist on testnet.');
console.log('');
console.log('   Using legacy seed_pool_prepare instead:');
console.log('   1. Mints team allocation (2M tokens)');
console.log('   2. Mints LP tokens');
console.log('   3. Transfers both SU ILFG + tokens to LP recipient');
console.log('   4. LP recipient can manually create Cetus pool\n');

const tx = new Transaction();
tx.moveCall({
  target: `${PLATFORM_PKG}::bonding_curve::seed_pool_prepare`,
  typeArguments: [COIN_TYPE],
  arguments: [
    tx.object(PLATFORM_CONFIG),
    tx.object(CURVE),
    tx.pure.u64(0), // bump_bps (0 = use default from config)
  ],
});
tx.setGasBudget(100_000_000);

console.log('🚀 Executing seed_pool_prepare...\n');

const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx,
  options: { showEffects: true, showObjectChanges: true, showBalanceChanges: true },
});

console.log(`📋 TX: ${result.digest}`);
console.log(`Status: ${result.effects?.status?.status}\n`);

if (result.effects?.status?.status === 'success') {
  console.log('✅ Pool tokens prepared!\n');
  
  console.log('📊 Balance changes:');
  for (const change of result.balanceChanges || []) {
    const amount = Number(change.amount) / 1e9;
    const coinName = change.coinType.split('::').pop();
    console.log(`   ${amount >= 0 ? '+' : ''}${amount.toLocaleString()} ${coinName} → ${change.owner.AddressOwner}`);
  }
  
  console.log('\n📝 Next steps:');
  console.log('   1. ✅ Payouts distributed');
  console.log('   2. ✅ Team tokens minted (2M)');
  console.log('   3. ✅ LP tokens prepared');
  console.log('   4. ⏳ Manually create Cetus pool with received tokens');
  console.log('');
  console.log('   💡 The LP recipient now has SUI LFG + FIX_MEMEFI tokens');
  console.log('      to create a Cetus pool manually via Cetus UI or SDK');
  
} else {
  console.log('❌ Failed:', result.effects?.status?.error);
}
