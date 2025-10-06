import 'dotenv/config';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

function kp(): Ed25519Keypair {
  const m = process.env.PAYER_MNEMONIC!;
  if (!m) throw new Error('PAYER_MNEMONIC missing');
  return Ed25519Keypair.deriveKeypair(m);
}

type NetworkName = 'localnet' | 'devnet' | 'testnet' | 'mainnet';
function getNetworkUrl(): string {
  const explicitUrl = process.env.SUI_FULLNODE_URL;
  if (explicitUrl && explicitUrl.length > 0) {
    return explicitUrl;
  }
  const networkEnv = (process.env.SUI_NETWORK ?? 'devnet').toLowerCase();
  const allowed: ReadonlyArray<NetworkName> = ['localnet', 'devnet', 'testnet', 'mainnet'];
  const network = (allowed.includes(networkEnv as NetworkName) ? networkEnv : 'devnet') as NetworkName;
  return getFullnodeUrl(network);
}

async function main() {
  const keypair = kp();
  const client = new SuiClient({ url: getNetworkUrl() });

  const PKG = process.env.PACKAGE_ID!;
  const CFG = process.env.PLATFORM_CONFIG_ID!;
  const CURVE = process.env.CURVE_ID!;
  const COIN_TYPE_T = process.env.COIN_TYPE_T!;

  const AMOUNT_MIST = BigInt(process.env.BUY_AMOUNT_MIST ?? '100000000'); // 0.1 SUI
  const MIN_TOKENS = Number(process.env.MIN_TOKENS ?? 1);
  const DEADLINE_MS = BigInt(Date.now() + 5 * 60_000);
  const CLOCK = '0x6';

  const txb = new TransactionBlock();
  const [payment] = txb.splitCoins(txb.gas, [txb.pure(AMOUNT_MIST)]);

  txb.moveCall({
    target: `${PKG}::bonding_curve::buy`,
    typeArguments: [COIN_TYPE_T],
    arguments: [
      txb.object(CFG),
      txb.object(CURVE),
      payment,
      txb.pure(AMOUNT_MIST),
      txb.pure(MIN_TOKENS),
      txb.pure(DEADLINE_MS),
      txb.object(CLOCK),
    ],
  });

  const res = await client.signAndExecuteTransactionBlock({
    signer: keypair, transactionBlock: txb,
    options: { showEffects: true, showObjectChanges: true },
  });
  console.log('✅ Buy OK. Digest:', res.digest);
}

main().catch(e => { console.error(e); process.exit(1); });
