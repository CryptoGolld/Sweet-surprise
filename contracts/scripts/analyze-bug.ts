// @ts-nocheck
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

console.log('🔍 ANALYZING THE BUG\n');

// Check the two buy transactions
const tx1 = '5k1mcBCLJtKB6jPzwhsps5TVdgPU2ecB1N8nAv1dd72N'; // First buy: 329M tokens
const tx2 = '76kuN7u8NaiN8cHZrnp6fW2hBwJ96pNMpbQsbBpf84LH'; // Second buy: 670M tokens

console.log('Transaction 1 (First buy - 329M tokens):');
const result1 = await client.getTransactionBlock({ digest: tx1, options: { showBalanceChanges: true, showInput: true } });

for (const change of result1.balanceChanges || []) {
  if (change.coinType.includes('TEST_MEMEFI')) {
    console.log(`  Tokens received: ${(Number(change.amount) / 1e9).toLocaleString()}`);
  } else if (change.coinType.includes('suilfg_memefi')) {
    console.log(`  SUILFG spent: ${(Math.abs(Number(change.amount)) / 1e9).toLocaleString()}`);
  }
}

console.log('\nTransaction 2 (Buyout - 670M tokens):');
const result2 = await client.getTransactionBlock({ digest: tx2, options: { showBalanceChanges: true, showInput: true } });

for (const change of result2.balanceChanges || []) {
  if (change.coinType.includes('TEST_MEMEFI')) {
    console.log(`  Tokens received: ${(Number(change.amount) / 1e9).toLocaleString()}`);
  } else if (change.coinType.includes('suilfg_memefi')) {
    console.log(`  SUILFG spent: ${(Math.abs(Number(change.amount)) / 1e9).toLocaleString()}`);
  }
}

console.log('\n📊 THE PROBLEM:');
console.log('  Max curve supply: 737,000,000 tokens');
console.log('  After TX1: 329,402,001 tokens sold');
console.log('  Remaining: 407,597,999 tokens');
console.log('  TX2 bought: 670,597,999 tokens ❌ (OVER THE LIMIT!)');
console.log('  Final supply: 1,000,000,000 tokens (TOTAL_SUPPLY)');
console.log('\n❌ BUG: Contract allowed buying 263M tokens OVER the max!');
console.log('   Should have capped at 407M remaining!');
