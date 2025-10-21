// @ts-nocheck
/**
 * Query GlobalConfig to find Pools object
 */
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

const GLOBAL_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_PACKAGE = '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12';

console.log('🔍 Strategy 1: Query GlobalConfig for Pools reference\n');

const config = await client.getObject({
  id: GLOBAL_CONFIG,
  options: { showContent: true, showType: true },
});

console.log('GlobalConfig content:', JSON.stringify(config.data?.content, null, 2));

console.log('\n🔍 Strategy 2: Check dynamic fields of GlobalConfig\n');

const dynamicFields = await client.getDynamicFields({
  parentId: GLOBAL_CONFIG,
});

console.log('Dynamic fields:', dynamicFields);

console.log('\n🔍 Strategy 3: Query recent transactions using GlobalConfig\n');

// Find transactions that involve GlobalConfig (pool creations)
const txs = await client.queryTransactionBlocks({
  filter: { InputObject: GLOBAL_CONFIG },
  options: { showInput: true, showEffects: true },
  limit: 20,
});

console.log(`Found ${txs.data.length} transactions using GlobalConfig\n`);

// Look for pool creation transactions
for (const tx of txs.data) {
  const txData: any = tx.transaction?.data;
  
  if (txData?.transaction?.kind === 'ProgrammableTransaction') {
    const commands = txData.transaction.transactions;
    
    // Look for MoveCall commands
    for (const cmd of commands || []) {
      if (cmd.MoveCall) {
        const moveCall = cmd.MoveCall;
        const target = `${moveCall.package}::${moveCall.module}::${moveCall.function}`;
        
        if (target.includes('create_pool') || target.includes('pool_creator')) {
          console.log(`✅ Found pool creation TX: ${tx.digest}`);
          console.log(`   Target: ${target}`);
          console.log(`   Arguments:`, moveCall.arguments);
          
          // The Pools object should be in the arguments!
          for (const arg of moveCall.arguments || []) {
            if (arg.Input !== undefined) {
              const inputIdx = arg.Input;
              const inputObj = txData.transaction.inputs?.[inputIdx];
              
              if (inputObj?.type === 'object' && inputObj.objectType === 'sharedObject') {
                console.log(`   📦 Shared Object Argument: ${inputObj.objectId}`);
                
                // Check if this is the Pools object
                const obj = await client.getObject({
                  id: inputObj.objectId,
                  options: { showType: true },
                });
                
                if (obj.data?.type?.includes('Pools')) {
                  console.log(`   🎯 THIS IS THE POOLS OBJECT: ${inputObj.objectId}\n`);
                  
                  console.log('╔══════════════════════════════════════════════════════════════╗');
                  console.log('║  ✅ FOUND IT!                                                ║');
                  console.log('╚══════════════════════════════════════════════════════════════╝\n');
                  console.log(`Pools Object: ${inputObj.objectId}`);
                  console.log(`Type: ${obj.data.type}`);
                  
                  process.exit(0);
                }
              }
            }
          }
          console.log('');
        }
      }
    }
  }
}

console.log('\n🔍 Strategy 4: Query Cetus package for Pools object creation\n');

// Find the transaction that published the Cetus package
const packageObj = await client.getObject({
  id: CETUS_PACKAGE,
  options: { showPreviousTransaction: true },
});

const publishTx = packageObj.data?.previousTransaction;
console.log(`Cetus package published in TX: ${publishTx}`);

if (publishTx) {
  const publishTxData = await client.getTransactionBlock({
    digest: publishTx,
    options: { showObjectChanges: true },
  });
  
  console.log('\nObjects created in publish transaction:');
  for (const change of publishTxData.objectChanges || []) {
    if (change.type === 'created') {
      console.log(`   ${change.objectId}: ${change.objectType}`);
      
      if (change.objectType?.includes('Pools')) {
        console.log(`   🎯 THIS IS THE POOLS OBJECT: ${change.objectId}\n`);
        
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║  ✅ FOUND IT!                                                ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        console.log(`Pools Object: ${change.objectId}`);
        console.log(`Type: ${change.objectType}`);
      }
    }
  }
}

console.log('\n💡 If not found, the Pools object might be created separately from package publish');
