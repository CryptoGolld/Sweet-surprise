import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const tx = new Transaction();

// Use the IDs from the last successful run
const CURVE = '0x6a0f765484f8ea1d40061913348590556065b131a7f48e0d5ed4dd120ac4a874';
const COIN_TYPE = '0x0c6e5866d36a4d734e550ec4b5ebeef32d40eca675ddb64185b572d45f49bc4f::test_memefi::TEST_MEMEFI';
const SUILFG_COIN = '0x568c3be934b704482f531ae35a742afefd64a41b9163b0bc84cd13e26a90025f';

tx.moveCall({
  target: '0x39d07cf6ad6896e3dafc19293165eb96d05b385f21fac4bb3d794e50408c6047::bonding_curve::buy',
  typeArguments: [COIN_TYPE],
  arguments: [
    tx.object('0x7fca4d72dcf81fc27f432bddc2ba07cd1fddf6517327ad448d845b2d3e77ef9c'),
    tx.object(CURVE),
    tx.object('0xf2d402107eb02d4ac5376e42cfcc09412cf968956ce66c31444621d34fc8828d'),
    tx.object(SUILFG_COIN),
    tx.pure(bcs.u64().serialize(1500000000000)),
    tx.pure(bcs.u64().serialize(1)),
    tx.pure(bcs.u64().serialize(Date.now() + 300000)),
    tx.pure(bcs.vector(bcs.Address).serialize([])),  // Empty referrer vector
    tx.object('0x6'),
  ],
});

tx.setGasBudget(100_000_000);

const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx,
  options: { showEffects: true, showBalanceChanges: true },
});

console.log('✅ Buy result:', result.digest);
console.log('Status:', result.effects?.status?.status);

for (const change of result.balanceChanges || []) {
  if (change.coinType.includes('TEST_MEMEFI')) {
    console.log(`🧪 Received: ${(Number(change.amount) / 1e9).toLocaleString()} tokens`);
  }
}
