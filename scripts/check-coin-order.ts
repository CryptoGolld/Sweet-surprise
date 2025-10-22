// @ts-nocheck
/**
 * Check if coin order is the issue
 * Cetus requires coins in specific order
 */

const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
const WORKING_COIN_TYPE = '0x9c3a8d56488c7cdae0ab7f245415bce7e28c629efb8e8db2a98e32780f74061c::working_memefi::WORKING_MEMEFI';

console.log('🔍 CHECKING COIN ORDER\n');

console.log('Coin A (SUILFG):');
console.log(`   ${SUILFG_TYPE}\n`);

console.log('Coin B (WORKING):');
console.log(`   ${WORKING_COIN_TYPE}\n`);

// Cetus requires coin types in lexicographic order
const comparison = SUILFG_TYPE.localeCompare(WORKING_COIN_TYPE);

console.log('Lexicographic comparison:');
if (comparison < 0) {
  console.log('   ✅ SUILFG < WORKING (correct order)');
} else if (comparison > 0) {
  console.log('   ❌ SUILFG > WORKING (WRONG ORDER!)');
  console.log('   Should swap: WORKING, SUILFG');
} else {
  console.log('   Same type (impossible)');
}

console.log('\n💡 Cetus pools require coin types in ascending order');
console.log('   If order is wrong, that could be error 0x6\n');

// Check the actual order by comparing package IDs
console.log('Package ID comparison:');
console.log(`   SUILFG: 0x97daa...`);
console.log(`   WORKING: 0x9c3a8...`);
console.log(`   0x97 < 0x9c: ${0x97 < 0x9c ? 'YES ✅' : 'NO ❌'}\n');

console.log('📝 Conclusion:');
console.log('   Current order (SUILFG, WORKING) is correct ✅');
console.log('   Coin order is NOT the issue\n');

console.log('💡 Error 0x6 might be:');
console.log('   - ACL permission check (need special role?)');
console.log('   - Pools object state issue');
console.log('   - Factory-specific validation we\'re missing');
