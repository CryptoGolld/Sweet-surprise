// @ts-nocheck
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const CURVE = '0xfb78d6b706a3e5cff8423422dcd530cd0fcceecfa2fd5b86a3e598e3362e1611';

const curve = await client.getObject({ id: CURVE, options: { showContent: true } });
const fields: any = curve.data?.content?.['fields'];

console.log('Curve State:');
console.log(`  graduated: ${fields.graduated}`);
console.log(`  lp_seeded: ${fields.lp_seeded}`);
console.log(`  reward_paid: ${fields.reward_paid}`);
console.log(`  token_supply: ${Number(fields.token_supply).toLocaleString()}`);

if (fields.lp_seeded) {
  console.log('\n⚠️  LP already seeded! (from legacy seed_pool_prepare)');
  console.log('   Cannot call seed_pool_and_create_cetus_with_lock');
  console.log('   Error E_LP_ALREADY_SEEDED = 5');
}
