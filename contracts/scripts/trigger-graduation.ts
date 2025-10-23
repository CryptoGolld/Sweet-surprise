// @ts-nocheck
/**
 * Trigger graduation for the full bonding curve
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
console.log('║  🎓 TRIGGERING GRADUATION                                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function main() {
  console.log('📋 Step 1: Calling try_graduate()...\n');
  
  const tx = new Transaction();
  tx.moveCall({
    target: `${PLATFORM_PKG}::bonding_curve::try_graduate`,
    typeArguments: [COIN_TYPE],
    arguments: [
      tx.object(PLATFORM_CONFIG),
      tx.object(CURVE),
    ],
  });
  tx.setGasBudget(100_000_000);
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true },
  });
  
  console.log(`   📋 TX: ${result.digest}`);
  console.log(`   Status: ${result.effects?.status?.status}\n`);
  
  if (result.effects?.status?.status === 'success') {
    console.log('   ✅ try_graduate() successful!\n');
    
    await new Promise(r => setTimeout(r, 3000));
    
    const curveAfter = await client.getObject({ id: CURVE, options: { showContent: true } });
    const fields: any = curveAfter.data?.content?.['fields'];
    
    console.log('   📊 Curve status:');
    console.log(`      Graduated: ${fields.graduated}`);
    console.log(`      Supply: ${Number(fields.token_supply).toLocaleString()}`);
    console.log(`      SUILFG balance: ${(Number(fields.sui_balance) / 1e9).toLocaleString()}\n`);
    
    if (fields.graduated) {
      console.log('   🎉 CURVE GRADUATED!');
      console.log('');
      console.log('   📝 Next steps:');
      console.log('      1. ✅ try_graduate() - DONE!');
      console.log('      2. ⏳ distribute_payouts() - Burns/Team distribution');
      console.log('      3. ⏳ seed_pool_and_create_cetus_with_lock() - Create LP');
      console.log('');
      console.log('   💡 This is now a graduated memecoin ready for DEX!');
    } else {
      console.log('   ⚠️  Still not graduated - checking requirements...');
      console.log(`      Supply: ${Number(fields.token_supply).toLocaleString()} (need 737M)`);
    }
    
  } else {
    console.log('   ❌ Graduation failed:');
    console.log(`      ${result.effects?.status?.error || 'Unknown error'}\n`);
    
    if (result.effects?.status?.error?.includes('E_NOT_SOLD_OUT')) {
      console.log('   ℹ️  Curve not sold out yet - need exactly 737M tokens sold');
    }
  }
}

main().catch(console.error);
