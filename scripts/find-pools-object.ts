// @ts-nocheck
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

console.log('🔍 Finding Cetus Pools object on testnet...\n');

// Query for Pools objects by type
const CETUS_PKG = '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12';

// Try to find the Pools object - it's likely a shared object
// Check Cetus docs/explorer for the known address

// From Cetus testnet deployment:
// https://app.cetus.zone/swap
// Or check their GitHub

const KNOWN_TESTNET_ADDRESSES = [
  '0x26579e72429b00a833c1f7b892c059f1b23a89cb0e749c5a2f77a5e72d70c0e5', // old?
  '0xf699e7f2276f5c9a75944b37a0c5b5d9ddfd2471bf6242483b03ab2887d198d0', // from docs
];

for (const addr of KNOWN_TESTNET_ADDRESSES) {
  try {
    const obj = await client.getObject({
      id: addr,
      options: { showType: true, showOwner: true },
    });
    
    if (obj.data) {
      console.log(`✅ Found object at ${addr}`);
      console.log(`   Type: ${obj.data.type}`);
      console.log(`   Owner: ${JSON.stringify(obj.data.owner)}\n`);
      
      if (obj.data.type?.includes('Pools')) {
        console.log(`🎯 THIS IS THE POOLS OBJECT!`);
      }
    }
  } catch (e: any) {
    console.log(`❌ ${addr}: not found`);
  }
}

// Alternative: The Pools object might be embedded in GlobalConfig or not needed at all
console.log('\n💡 Checking if we can call without Pools parameter...');
console.log('   Some Cetus versions merged Pools into GlobalConfig');
