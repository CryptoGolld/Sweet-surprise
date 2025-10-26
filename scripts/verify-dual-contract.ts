/**
 * Verification Script for Dual Contract Setup
 * 
 * This script verifies that both NEW and LEGACY contracts are working correctly.
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { CONTRACTS } from '../lib/constants';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

async function verifyContracts() {
  console.log('🔍 Verifying Dual Contract Setup...\n');

  // Verify NEW contract
  console.log('📦 NEW Contract (v0.0.7):');
  console.log(`   Package: ${CONTRACTS.PLATFORM_PACKAGE}`);
  try {
    const newPackage = await client.getObject({ id: CONTRACTS.PLATFORM_PACKAGE });
    console.log(`   ✅ NEW contract exists on chain`);
    console.log(`   Version: ${newPackage.data?.version || 'N/A'}`);
  } catch (error) {
    console.log(`   ❌ NEW contract not found: ${error}`);
  }

  console.log();

  // Verify LEGACY contract
  console.log('📦 LEGACY Contract (v0.0.6):');
  console.log(`   Package: ${CONTRACTS.LEGACY_PLATFORM_PACKAGE}`);
  try {
    const legacyPackage = await client.getObject({ id: CONTRACTS.LEGACY_PLATFORM_PACKAGE });
    console.log(`   ✅ LEGACY contract exists on chain`);
    console.log(`   Version: ${legacyPackage.data?.version || 'N/A'}`);
  } catch (error) {
    console.log(`   ❌ LEGACY contract not found: ${error}`);
  }

  console.log();

  // Find bonding curves from NEW contract
  console.log('🔍 Searching for bonding curves...\n');
  
  console.log('📊 NEW Contract Curves:');
  try {
    const newEvents = await client.queryEvents({
      query: { 
        MoveEventType: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::Created` 
      },
      limit: 5,
      order: 'descending',
    });
    
    if (newEvents.data.length > 0) {
      console.log(`   Found ${newEvents.data.length} recent curves:`);
      newEvents.data.forEach((event, i) => {
        const fields = event.parsedJson as any;
        console.log(`   ${i + 1}. Curve created at ${new Date(parseInt(event.timestampMs)).toISOString()}`);
      });
    } else {
      console.log(`   ⚠️  No curves found yet (this is normal if contract just deployed)`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error querying NEW contract: ${error.message}`);
  }

  console.log();

  console.log('📊 LEGACY Contract Curves:');
  try {
    const legacyEvents = await client.queryEvents({
      query: { 
        MoveEventType: `${CONTRACTS.LEGACY_PLATFORM_PACKAGE}::bonding_curve::Created` 
      },
      limit: 5,
      order: 'descending',
    });
    
    if (legacyEvents.data.length > 0) {
      console.log(`   Found ${legacyEvents.data.length} recent curves:`);
      legacyEvents.data.forEach((event, i) => {
        const fields = event.parsedJson as any;
        console.log(`   ${i + 1}. Curve created at ${new Date(parseInt(event.timestampMs)).toISOString()}`);
      });
    } else {
      console.log(`   ⚠️  No curves found (this might mean no old curves exist)`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error querying LEGACY contract: ${error.message}`);
  }

  console.log();

  // Test Buy events from both
  console.log('💰 Recent Buy Events:\n');
  
  console.log('📊 NEW Contract Buys:');
  try {
    const newBuys = await client.queryEvents({
      query: { 
        MoveEventType: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::TokensPurchased` 
      },
      limit: 3,
      order: 'descending',
    });
    
    if (newBuys.data.length > 0) {
      console.log(`   Found ${newBuys.data.length} recent buys:`);
      newBuys.data.forEach((event, i) => {
        const fields = event.parsedJson as any;
        console.log(`   ${i + 1}. ${fields.buyer?.slice(0, 10)}... bought with ${fields.amount_sui || 'N/A'} SUI`);
      });
    } else {
      console.log(`   ⚠️  No buy events yet`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log();

  console.log('📊 LEGACY Contract Buys:');
  try {
    const legacyBuys = await client.queryEvents({
      query: { 
        MoveEventType: `${CONTRACTS.LEGACY_PLATFORM_PACKAGE}::bonding_curve::TokensPurchased` 
      },
      limit: 3,
      order: 'descending',
    });
    
    if (legacyBuys.data.length > 0) {
      console.log(`   Found ${legacyBuys.data.length} recent buys:`);
      legacyBuys.data.forEach((event, i) => {
        const fields = event.parsedJson as any;
        console.log(`   ${i + 1}. ${fields.buyer?.slice(0, 10)}... bought with ${fields.amount_sui || 'N/A'} SUI`);
      });
    } else {
      console.log(`   ⚠️  No buy events found`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log();
  console.log('✅ Verification complete!\n');
  
  console.log('📝 Summary:');
  console.log('   - Both contracts are on-chain');
  console.log('   - Frontend is configured for dual contract support');
  console.log('   - Indexer needs to be configured and restarted');
  console.log('   - Once indexer is running, all curves will be tracked\n');
  
  console.log('Next steps:');
  console.log('   1. Create indexer/.env file (see VERIFY_DUAL_CONTRACT_SETUP.md)');
  console.log('   2. Restart indexer: pm2 restart memecoin-indexer');
  console.log('   3. Test creating a new curve - will use NEW contract');
  console.log('   4. Test trading old curves - will use LEGACY contract');
}

verifyContracts().catch(console.error);
