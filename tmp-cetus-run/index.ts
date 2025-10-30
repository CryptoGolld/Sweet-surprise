// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { CetusClmmSDK, clmmTestnet } from '@cetusprotocol/cetus-sui-clmm-sdk';

const SEED = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
const RPC = 'https://fullnode.testnet.sui.io:443';
const SQRT_PRICE_1_TO_1 = '18446744073709551616';
const TICK_SPACINGS = [60, 200, 1000];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function distinctCoinTypes(client, owner) {
  const types = new Set();
  let cursor = null;
  do {
    const resp = await client.getAllCoins({ owner, cursor, limit: 1000 });
    for (const c of resp.data) types.add(c.coinType);
    cursor = resp.nextCursor;
  } while (cursor);
  return Array.from(types);
}

function normalizePair(a, b) { return a < b ? [a, b] : [b, a]; }

async function tryCreatePool(sdk, client, signer, coinTypeA, coinTypeB, tickSpacing) {
  try {
    const tx = await sdk.Pool.createPoolTransactionPayload({
      coinTypeA,
      coinTypeB,
      tickSpacing: tickSpacing,
      initializeSqrtPrice: SQRT_PRICE_1_TO_1,
      uri: '',
    } as any);
    const res = await client.signAndExecuteTransaction({
      signer,
      transaction: tx,
      options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });
    const status = res.effects?.status?.status;
    console.log(`Create pool ${coinTypeA} | ${coinTypeB} (tick ${tickSpacing}) -> ${status} (${res.digest})`);
    if (status !== 'success') console.log('Error:', res.effects?.status?.error);
    return status === 'success';
  } catch (e) {
    console.log(`Create pool failed for ${coinTypeA} | ${coinTypeB}:`, e?.message || String(e));
    return false;
  }
}

async function main() {
  const keypair = Ed25519Keypair.deriveKeypair(SEED);
  const address = keypair.getPublicKey().toSuiAddress();
  const client = new SuiClient({ url: RPC });
  console.log(`Using wallet: ${address}`);

  const sdk = new CetusClmmSDK({
    clmmConfig: clmmTestnet as any,
    fullRpcUrl: RPC,
  } as any);
  sdk.senderAddress = address;

  const types = await distinctCoinTypes(client, address);
  const SUI = '0x2::sui::SUI';
  if (!types.includes(SUI)) types.push(SUI);
  console.log(`Found ${types.length} coin types`);

  const pairs = [];
  for (let i = 0; i < types.length; i++) {
    for (let j = i + 1; j < types.length; j++) {
      pairs.push(normalizePair(types[i], types[j]));
    }
  }
  const shuffled = shuffle(pairs);
  const MAX_ATTEMPTS = 5;
  let attempts = 0;
  const seen = new Set();

  for (const [a, b] of shuffled) {
    if (attempts >= MAX_ATTEMPTS) break;
    const key = `${a}|${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const tick = TICK_SPACINGS[Math.floor(Math.random() * TICK_SPACINGS.length)];
    console.log(`\nAttempting pool ${a} <-> ${b} @ tick ${tick}`);
    await tryCreatePool(sdk, client, keypair, a, b, tick);
    attempts++;
  }
  console.log(`\nDone. Attempts: ${attempts}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
