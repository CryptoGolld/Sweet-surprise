// @ts-nocheck
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

// Check what package pool_creator belongs to
const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';

console.log('Searching for Cetus pool_creator package and Pools object...\n');

// The pool_creator::create_pool_v2 function should be in a Cetus package
// Let's check the dependencies in our Move.toml
const packageAddr = '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12';

console.log(`Cetus CLMM package: ${packageAddr}`);
console.log(`Config object: ${CETUS_CONFIG}\n`);

// Query the config to see if it has pool references
const config = await client.getObject({
  id: CETUS_CONFIG,
  options: { showContent: true, showType: true },
});

console.log('Config type:', config.data?.type);

// Check our contract's Move.toml to see what Cetus package we're using
console.log('\nLet me check if Pools is even required...');
console.log('Reading bonding_curve.move pool_creator calls...');
