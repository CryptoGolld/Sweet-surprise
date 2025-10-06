import 'dotenv/config';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

function kp(): Ed25519Keypair {
  const m = process.env.PAYER_MNEMONIC!;
  if (!m) throw new Error('PAYER_MNEMONIC missing');
  return Ed25519Keypair.deriveKeypair(m);
}

async function main() {
  const keypair = kp();
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });

  const PKG = process.env.PACKAGE_ID!;
  const CFG = process.env.PLATFORM_CONFIG_ID!;
  const CURVE = process.env.CURVE_ID!;
  const COIN_TYPE_T = process.env.COIN_TYPE_T!;
  const BUMP_BPS = Number(process.env.BUMP_BPS ?? 0); // 0 = use platform default

  const txb = new TransactionBlock();

  txb.moveCall({
    target: `${PKG}::bonding_curve::try_graduate`,
    typeArguments: [COIN_TYPE_T],
    arguments: [txb.object(CFG), txb.object(CURVE)],
  });

  txb.moveCall({
    target: `${PKG}::bonding_curve::distribute_payouts`,
    typeArguments: [COIN_TYPE_T],
    arguments: [txb.object(CFG), txb.object(CURVE)],
  });

  txb.moveCall({
    target: `${PKG}::bonding_curve::seed_pool_prepare`,
    typeArguments: [COIN_TYPE_T],
    arguments: [txb.object(CFG), txb.object(CURVE), txb.pure(BUMP_BPS)],
  });

  const res = await client.signAndExecuteTransactionBlock({
    signer: keypair, transactionBlock: txb,
    options: { showEffects: true, showObjectChanges: true },
  });
  console.log('✅ Graduated + Prepared LP. Digest:', res.digest);
}

main().catch(e => { console.error(e); process.exit(1); });
