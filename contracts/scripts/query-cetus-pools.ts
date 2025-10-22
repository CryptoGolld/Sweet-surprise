// @ts-nocheck
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';

console.log('🔍 Querying Cetus objects...\n');

try {
  const config = await client.getObject({
    id: CETUS_CONFIG,
    options: { showContent: true },
  });
  
  console.log('Cetus Config:', config.data?.content);
  
  // Try to find Pools object by querying dynamic fields
  const fields = await client.getDynamicFields({ parentId: CETUS_CONFIG });
  console.log('\nDynamic fields:', fields);
  
} catch (e: any) {
  console.log('Error:', e.message);
}

// Known Cetus testnet pools from docs
const KNOWN_POOLS = '0x26579e72429b00a833c1f7b892c059f1b23a89cb0e749c5a2f77a5e72d70c0e5';

try {
  const pools = await client.getObject({ id: KNOWN_POOLS });
  console.log('\nKnown pools object exists:', pools.data !== null);
} catch (e: any) {
  console.log('\nKnown pools ERROR:', e.message);
  console.log('Pools object might have changed - checking latest Cetus docs...');
}
