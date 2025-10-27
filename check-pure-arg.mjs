import { bcs } from '@mysten/sui/bcs';

// Try different ways to serialize Option<address> as None
console.log('1. bcs.option(bcs.Address).serialize(null):');
const opt1 = bcs.option(bcs.Address).serialize(null);
console.log('  Bytes:', Buffer.from(opt1).toString('hex'));

console.log('\n2. bcs.vector(bcs.Address).serialize([]):');
const opt2 = bcs.vector(bcs.Address).serialize([]);
console.log('  Bytes:', Buffer.from(opt2).toString('hex'));

console.log('\n3. Just [0x00] (None in BCS):');
console.log('  Bytes: 00');
