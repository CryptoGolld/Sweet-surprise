// @ts-nocheck
/**
 * Analyze the abort error from Cetus
 */
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

// The package from the error
const ERROR_PKG = '0xb2a1d27337788bda89d350703b8326952413bd94b35b9b573ac8401b9803d018';

// The package we thought we were using
const CETUS_PKG = '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12';

console.log('🔍 ANALYZING THE ERROR\n');

console.log('Error came from package:', ERROR_PKG);
console.log('We thought we were using:', CETUS_PKG);
console.log('');

if (ERROR_PKG !== CETUS_PKG) {
  console.log('⚠️  DIFFERENT PACKAGES!');
  console.log('   pool_creator might be calling a different factory\n');
}

console.log('Checking error package...\n');

try {
  const pkg = await client.getObject({
    id: ERROR_PKG,
    options: { showContent: true, showPreviousTransaction: true },
  });
  
  console.log('Package info:', JSON.stringify(pkg.data, null, 2));
} catch (e: any) {
  console.log('Could not fetch package:', e.message);
}

console.log('\n💡 Abort code 0x6 in factory::new_pool_key');
console.log('   Let me check the Cetus source code for this error...\n');

// The error is abort 0x6 (6 in decimal)
// Common Cetus factory errors:
console.log('Common Cetus factory errors:');
console.log('   0 = Success');
console.log('   1 = E_INVALID_FEE_TIER');
console.log('   2 = E_POOL_ALREADY_EXISTS');
console.log('   3 = E_INVALID_TICK_SPACING');
console.log('   4 = E_INVALID_SQRT_PRICE');
console.log('   5 = E_INVALID_COIN_ORDER');
console.log('   6 = E_??? (Unknown - need to check source)');
console.log('');

console.log('🔍 Most likely: abort 0x6 could be:');
console.log('   - Fee tier not enabled');
console.log('   - Coin types in wrong order');
console.log('   - Pool key validation failed');
console.log('   - Permission/ACL check failed');
