// @ts-nocheck
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

const PKG1 = '0x19dd42e05fa6c9988a60d30686ee3feb776672b5547e328d6dab16563da65293';
const PKG2 = '0x2918cf39850de6d5d94d8196dc878c8c722cd79db659318e00bff57fbb4e2ede';

console.log('Checking both pool_creator_v2 package addresses...\n');

for (const pkg of [PKG1, PKG2]) {
  console.log(`Package: ${pkg}`);
  try {
    const obj = await client.getObject({
      id: pkg,
      options: { showContent: false },
    });
    console.log(`  Status: ${obj.data ? 'EXISTS ✅' : 'NOT FOUND ❌'}\n`);
  } catch (e: any) {
    console.log(`  Error: ${e.message}\n`);
  }
}

console.log('💡 The TypeArgumentError might mean:');
console.log('   - Package doesn\'t exist on this network');
console.log('   - Package version mismatch');
console.log('   - Coin types need to be published first');
console.log('   - Different testnet (the event might be from different chain)');
