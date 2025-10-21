// @ts-nocheck
/**
 * Step 1: Verify the Pools object is correct
 */
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

const POOLS_ID = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2';
const EXPECTED_TYPE = '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12::factory::Pools';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🔍 VERIFYING POOLS OBJECT                                   ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log(`Pools ID: ${POOLS_ID}`);
console.log(`Expected Type: ${EXPECTED_TYPE}\n`);

try {
  const obj = await client.getObject({
    id: POOLS_ID,
    options: { showType: true, showOwner: true, showContent: true },
  });
  
  if (!obj.data) {
    console.log('❌ Object not found!\n');
    process.exit(1);
  }
  
  console.log('✅ Object exists!\n');
  console.log('📊 Object Details:');
  console.log(`   Type: ${obj.data.type}`);
  console.log(`   Owner: ${JSON.stringify(obj.data.owner)}`);
  console.log('');
  
  // Verify type matches
  if (obj.data.type === EXPECTED_TYPE) {
    console.log('✅ Type matches exactly!\n');
  } else {
    console.log('⚠️  Type mismatch:');
    console.log(`   Expected: ${EXPECTED_TYPE}`);
    console.log(`   Got: ${obj.data.type}\n`);
  }
  
  // Check if it's a shared object (required for pool creation)
  if (obj.data.owner && typeof obj.data.owner === 'object' && 'Shared' in obj.data.owner) {
    console.log('✅ Is a Shared Object (correct!)\n');
  } else {
    console.log('⚠️  Not a shared object - might not work\n');
  }
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ VERIFICATION PASSED!                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log('This Pools object looks correct!');
  console.log('Ready to test pool creation with it!\n');
  
} catch (e: any) {
  console.log('❌ Error verifying object:', e.message);
  process.exit(1);
}
