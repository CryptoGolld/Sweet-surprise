// @ts-nocheck
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const address = '0x488e0c6d14c2334da9d72a309e7b63b37fdf93f2faa910e203aa7f73260df25f';

console.log('🔍 Finding required objects...\n');

const objects = await client.getOwnedObjects({
  owner: address,
  options: { showType: true, showContent: true },
});

let fixMetadata = null;
let suilfgMetadata = null;

for (const obj of objects.data) {
  const type = obj.data?.type || '';
  
  if (type.includes('CoinMetadata') && type.includes('fix_memefi::FIX_MEMEFI')) {
    fixMetadata = obj.data.objectId;
    console.log(`✅ FIX_MEMEFI metadata: ${fixMetadata}`);
  }
  
  if (type.includes('CoinMetadata') && type.includes('faucet::SUILFG_MEMEFI')) {
    suilfgMetadata = obj.data.objectId;
    console.log(`✅ SUILFG_MEMEFI metadata: ${suilfgMetadata}`);
  }
}

// Get platform config
const configObj = await client.getObject({
  id: '0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07',
  options: { showContent: true },
});

const fields: any = configObj.data?.content?.['fields'];

console.log(`\n📋 Platform Config:`);
console.log(`   Cetus Global Config: ${fields.cetus_global_config_id}`);

// Query Cetus pools object
console.log(`\n🔍 Querying Cetus on testnet...`);

// Testnet Cetus addresses (from Cetus docs)
const TESTNET_CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const TESTNET_CETUS_POOLS = '0x26579e72429b00a833c1f7b892c059f1b23a89cb0e749c5a2f77a5e72d70c0e5';

console.log(`   Standard testnet Cetus Config: ${TESTNET_CETUS_CONFIG}`);
console.log(`   Standard testnet Cetus Pools: ${TESTNET_CETUS_POOLS}`);

console.log('\n📝 Summary:');
console.log(`   FIX_MEMEFI metadata: ${fixMetadata || 'NOT FOUND'}`);
console.log(`   SUILFG metadata: ${suilfgMetadata || 'NOT FOUND'}`);
console.log(`   Cetus Config (from platform): ${fields.cetus_global_config_id}`);
console.log(`   Cetus Config (testnet standard): ${TESTNET_CETUS_CONFIG}`);
