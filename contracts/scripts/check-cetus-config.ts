// @ts-nocheck
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';

console.log('🔍 Checking Cetus GlobalConfig\n');

const config = await client.getObject({
  id: CETUS_CONFIG,
  options: { showContent: true },
});

const fields: any = config.data?.content?.['fields'];

console.log('GlobalConfig fields:');
console.log(JSON.stringify(fields, null, 2));

console.log('\n📊 Fee Tiers:');
if (fields.fee_tiers && fields.fee_tiers.fields && fields.fee_tiers.fields.contents) {
  for (const tier of fields.fee_tiers.fields.contents) {
    console.log(`   Tick spacing: ${tier.fields.key}`);
    console.log(`   Fee rate: ${tier.fields.value.fields.fee_rate}`);
    console.log('');
  }
} else {
  console.log('   Could not parse fee tiers');
  console.log('   Fee tiers structure:', fields.fee_tiers);
}

console.log('\n💡 Let me also check if there are any existing pools for SUILFG...');
