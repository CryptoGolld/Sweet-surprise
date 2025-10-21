// @ts-nocheck
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const CURVE_ID = '0x6a0f765484f8ea1d40061913348590556065b131a7f48e0d5ed4dd120ac4a874';

console.log('🔍 Checking Graduation Status...\n');

const curve = await client.getObject({ 
  id: CURVE_ID, 
  options: { showContent: true } 
});

const fields: any = curve.data?.content?.['fields'];

console.log('📊 Bonding Curve Status:');
console.log(`   Token Supply: ${Number(fields.token_supply).toLocaleString()}`);
console.log(`   Max Supply: 737,000,000`);
console.log(`   SUI Balance: ${(Number(fields.sui_balance) / 1e9).toLocaleString()} SUILFG`);
console.log(`   Graduated: ${fields.graduated}`);
console.log('');

if (fields.graduated) {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🎊 GRADUATION SUCCESSFUL! 🎊                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  // Look for pool object
  console.log('🔍 Searching for liquidity pool...\n');
  
  // Check if curve has pool_id field
  if (fields.pool_id) {
    console.log(`✅ Pool ID: ${fields.pool_id}`);
    
    const pool = await client.getObject({
      id: fields.pool_id,
      options: { showContent: true }
    });
    
    console.log('\n📦 Pool Details:');
    console.log(JSON.stringify(pool, null, 2));
  } else {
    console.log('⚠️  Pool ID not found in curve fields');
    console.log('   Available fields:', Object.keys(fields));
  }
  
} else {
  console.log('❌ NOT Graduated');
  console.log(`   Supply: ${Number(fields.token_supply).toLocaleString()}`);
  console.log(`   This is ${Number(fields.token_supply) > 737000000 ? 'OVER' : 'UNDER'} the max!`);
}
