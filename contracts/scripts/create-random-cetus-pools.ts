// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { CetusClmmSDK, clmmTestnet } from '@cetusprotocol/cetus-sui-clmm-sdk';

const SEED = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
const RPC = 'https://fullnode.testnet.sui.io:443';

// Q64.64 sqrt price for 1:1
const SQRT_PRICE_1_TO_1 = '18446744073709551616';

// Valid common tick spacings on Cetus (approx: 0.3%, 1%, 5%)
const TICK_SPACINGS = [60, 200, 1000];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function distinctCoinTypes(client: SuiClient, owner: string): Promise<string[]> {
  const types = new Set<string>();
  let cursor: string | null = null;
  do {
    const resp = await client.getAllCoins({ owner, cursor, limit: 1000 });
    for (const c of resp.data) {
      types.add(c.coinType);
    }
    cursor = resp.nextCursor;
  } while (cursor);
  return Array.from(types);
}

function normalizePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function tryCreatePool(
  sdk: CetusClmmSDK,
  client: SuiClient,
  signer: Ed25519Keypair,
  coinTypeA: string,
  coinTypeB: string,
  tickSpacing: number
) {
  try {
    const tx = await sdk.Pool.createPoolTransactionPayload({
      coinTypeA,
      coinTypeB,
      tick_spacing: tickSpacing,
      initialize_sqrt_price: SQRT_PRICE_1_TO_1,
      uri: '',
    });

    const res = await client.signAndExecuteTransaction({
      signer,
      transaction: tx,
      options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });

    const status = res.effects?.status?.status;
    console.log(`Create pool ${coinTypeA} | ${coinTypeB} (tick ${tickSpacing}) -> ${status} (${res.digest})`);
    if (status !== 'success') {
      console.log('Error:', res.effects?.status?.error);
    }
    return status === 'success';
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.log(`Create pool failed for ${coinTypeA} | ${coinTypeB}: ${msg}`);
    return false;
  }
}

async function main() {
  const keypair = Ed25519Keypair.deriveKeypair(SEED);
  const address = keypair.getPublicKey().toSuiAddress();
  const client = new SuiClient({ url: RPC });

  console.log(`Using wallet: ${address}`);

  const sdk = new CetusClmmSDK(clmmTestnet());
  sdk.senderAddress = address;

  const allTypes = await distinctCoinTypes(client, address);
  // Always include SUI for pairing
  const SUI = '0x2::sui::SUI';
  if (!allTypes.includes(SUI)) allTypes.push(SUI);

  // Exclude some known problematic internal types if needed (none for now)
  const filtered = allTypes;

  console.log(`Found ${filtered.length} coin types`);
  filtered.forEach((t, i) => console.log(`${i + 1}. ${t}`));

  // Build candidate unordered pairs (A < B), shuffle, and attempt a few
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      pairs.push(normalizePair(filtered[i], filtered[j]));
    }
  }

  const shuffledPairs = shuffle(pairs);

  // Attempt up to N random pools
  const MAX_ATTEMPTS = 5;
  let attempts = 0;
  const tried = new Set<string>();

  for (const [a, b] of shuffledPairs) {
    if (attempts >= MAX_ATTEMPTS) break;
    const key = `${a}|${b}`;
    if (tried.has(key)) continue;
    tried.add(key);

    const tick = TICK_SPACINGS[Math.floor(Math.random() * TICK_SPACINGS.length)];
    console.log(`\nAttempting pool ${a} <-> ${b} @ tick ${tick}`);
    const ok = await tryCreatePool(sdk, client, keypair, a, b, tick);
    attempts++;

    // If success, continue to next; if fail, just move on
  }

  console.log(`\nDone. Attempts: ${attempts}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
