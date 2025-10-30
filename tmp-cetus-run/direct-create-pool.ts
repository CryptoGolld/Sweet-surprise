// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const SEED = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
const RPC = 'https://fullnode.testnet.sui.io:443';
const CLOCK = '0x6';

// Cetus testnet objects (from repo)
const CETUS_PKG = '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12';
const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2';

// SUILFG faucet and metadata
const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
const SUILFG_FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const SUILFG_ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';
const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';

const SUI_TYPE = '0x2::sui::SUI';
const SQRT_PRICE_1_TO_1 = '18446744073709551616';
const FIX_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';
const FIX_CURVE = '0xfb78d6b706a3e5cff8423422dcd530cd0fcceecfa2fd5b86a3e598e3362e1611';

async function getOwnedCoinObject(client: SuiClient, owner: string, typeArg: string) {
  const coins = await client.getCoins({ owner, coinType: typeArg });
  return coins.data[0]?.coinObjectId || null;
}

async function splitSui(client: SuiClient, kp: Ed25519Keypair, amount: bigint) {
  // Find a SUI coin
  const tx = new Transaction();
  const owner = kp.getPublicKey().toSuiAddress();
  tx.setSender(owner);
  const [split] = tx.splitCoins(tx.gas, [tx.pure.u64(amount.toString())]);
  // keep both coins, return split object id via transfer to self to materialize
  tx.transferObjects([split], owner);
  tx.setGasBudget(20_000_000);
  const res = await client.signAndExecuteTransaction({ signer: kp, transaction: tx, options: { showObjectChanges: true } });
  const created = (res.objectChanges || []).find((c: any) => c.type === 'created' && (c.objectType || '').includes('Coin<0x2::sui::SUI>'));
  if (!created) throw new Error('Failed to split SUI');
  return created.objectId;
}

async function ensureSuilfgBalance(client: SuiClient, kp: Ed25519Keypair) {
  // Try to mint some SUILFG to ensure we have balance
  const tx = new Transaction();
  tx.moveCall({
    target: '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::admin_mint',
    arguments: [
      tx.object(SUILFG_FAUCET),
      tx.object(SUILFG_ADMIN_CAP),
      tx.pure.u64(1_000_000_000_000), // 1M SUILFG
    ],
  });
  tx.setGasBudget(30_000_000);
  try {
    await client.signAndExecuteTransaction({ signer: kp, transaction: tx });
  } catch (_) { /* ignore if fails */ }
}

async function createPoolSuiVsSuilfg() {
  const client = new SuiClient({ url: RPC });
  const keypair = Ed25519Keypair.deriveKeypair(SEED);
  const owner = keypair.getPublicKey().toSuiAddress();
  console.log('Owner:', owner);

  await ensureSuilfgBalance(client, keypair);

  // Prepare coins
  const suiCoin = await splitSui(client, keypair, 100_000_000n); // 0.1 SUI (9 decimals)
  let suilfgCoin = await getOwnedCoinObject(client, owner, SUILFG_TYPE);
  if (!suilfgCoin) throw new Error('No SUILFG Coin found');

  // Order types lexicographically
  const [typeA, typeB] = SUI_TYPE < SUILFG_TYPE ? [SUI_TYPE, SUILFG_TYPE] : [SUILFG_TYPE, SUI_TYPE];
  const coinA = typeA === SUI_TYPE ? suiCoin : suilfgCoin;
  const coinB = typeB === SUI_TYPE ? suiCoin : suilfgCoin;
  const metaA = typeA === SUILFG_TYPE ? SUILFG_METADATA : '0x0000000000000000000000000000000000000000000000000000000000000000';
  const metaB = typeB === SUILFG_TYPE ? SUILFG_METADATA : '0x0000000000000000000000000000000000000000000000000000000000000000';

  const tx = new Transaction();
  tx.setSender(owner);
  tx.setGasBudget(500_000_000);

  // Full range ticks used in example for spacing 200
  const tickLower = 4295048;
  const tickUpper = 4295848;
  const tickSpacing = 200;

  tx.moveCall({
    target: `${CETUS_PKG}::pool_creator::create_pool_v2`,
    typeArguments: [typeA, typeB],
    arguments: [
      tx.object(CETUS_CONFIG),
      tx.object(CETUS_POOLS),
      tx.pure.u32(tickSpacing),
      tx.pure.u128(SQRT_PRICE_1_TO_1),
      tx.pure.string('Direct move pool'),
      tx.pure.u32(tickLower),
      tx.pure.u32(tickUpper),
      tx.object(coinA),
      tx.object(coinB),
      tx.object(metaA),
      tx.object(metaB),
      tx.pure.bool(false),
      tx.object(CLOCK),
    ],
  });

  const res = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx, options: { showEffects: true, showObjectChanges: true, showEvents: true } });
  console.log('TX:', res.digest, 'status:', res.effects?.status?.status);
  if (res.effects?.status?.status !== 'success') console.log('Error:', res.effects?.status?.error);
}

async function main() {
  const client = new SuiClient({ url: RPC });
  const keypair = Ed25519Keypair.deriveKeypair(SEED);
  const owner = keypair.getPublicKey().toSuiAddress();
  console.log('Owner:', owner);

  // 1) Try SUI vs any token we own: prefer FIX_MEMEFI if present
  const fixCoinObj = await getOwnedCoinObject(client, owner, FIX_TYPE);
  if (fixCoinObj) {
    // fetch FIX metadata from curve object
    const curve = await client.getObject({ id: FIX_CURVE, options: { showContent: true } });
    const fixMeta = (curve as any).data?.content?.fields?.token_metadata;
    if (!fixMeta) throw new Error('Cannot resolve FIX metadata');

    const suiCoin = await splitSui(client, keypair, 100_000_000n);

    const [typeA, typeB] = SUI_TYPE < FIX_TYPE ? [SUI_TYPE, FIX_TYPE] : [FIX_TYPE, SUI_TYPE];
    const coinA = typeA === SUI_TYPE ? suiCoin : fixCoinObj;
    const coinB = typeB === SUI_TYPE ? suiCoin : fixCoinObj;
    const metaA = typeA === FIX_TYPE ? fixMeta : '0x0000000000000000000000000000000000000000000000000000000000000000';
    const metaB = typeB === FIX_TYPE ? fixMeta : '0x0000000000000000000000000000000000000000000000000000000000000000';

    const tx = new Transaction();
    tx.setSender(owner);
    tx.setGasBudget(300_000_000);
    const tickLower = 4295048; const tickUpper = 4295848; const tickSpacing = 200;
    tx.moveCall({
      target: `${CETUS_PKG}::pool_creator::create_pool_v2`,
      typeArguments: [typeA, typeB],
      arguments: [
        tx.object(CETUS_CONFIG),
        tx.object(CETUS_POOLS),
        tx.pure.u32(tickSpacing),
        tx.pure.u128(SQRT_PRICE_1_TO_1),
        tx.pure.string('Direct move pool'),
        tx.pure.u32(tickLower),
        tx.pure.u32(tickUpper),
        tx.object(coinA),
        tx.object(coinB),
        tx.object(metaA),
        tx.object(metaB),
        tx.pure.bool(false),
        tx.object(CLOCK),
      ],
    });
    const res = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx, options: { showEffects: true, showObjectChanges: true, showEvents: true } });
    console.log('SUI-FIX TX:', res.digest, 'status:', res.effects?.status?.status);
    if (res.effects?.status?.status !== 'success') console.log('Error:', res.effects?.status?.error);
  } else {
    // fallback to SUILFG attempt (may fail if no SUILFG coins)
    await createPoolSuiVsSuilfg();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
