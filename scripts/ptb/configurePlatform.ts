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
  const ADMIN = process.env.ADMIN_CAP_ID!;

  const M_NUM = Number(process.env.M_NUM ?? 3);
  const M_DEN = BigInt(process.env.M_DEN ?? '100000000000000');
  const CUT_BPS = Number(process.env.CUT_BPS ?? 500);
  const CREATOR_PAYOUT_MIST = BigInt(process.env.CREATOR_PAYOUT_MIST ?? '40000000000');
  const CETUS_BUMP_BPS = Number(process.env.CETUS_BUMP_BPS ?? 1000);

  const txb = new TransactionBlock();

  txb.moveCall({
    target: `${PKG}::platform_config::set_default_m`,
    arguments: [txb.object(ADMIN), txb.object(CFG), txb.pure(M_NUM), txb.pure(M_DEN)],
  });
  txb.moveCall({
    target: `${PKG}::platform_config::set_platform_cut_on_graduation`,
    arguments: [txb.object(ADMIN), txb.object(CFG), txb.pure(CUT_BPS)],
  });
  txb.moveCall({
    target: `${PKG}::platform_config::set_creator_graduation_payout`,
    arguments: [txb.object(ADMIN), txb.object(CFG), txb.pure(CREATOR_PAYOUT_MIST)],
  });
  txb.moveCall({
    target: `${PKG}::platform_config::set_default_cetus_bump_bps`,
    arguments: [txb.object(ADMIN), txb.object(CFG), txb.pure(CETUS_BUMP_BPS)],
  });

  const res = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: txb,
    options: { showEffects: true },
  });
  console.log('✅ Config set. Digest:', res.digest);
}

main().catch(e => { console.error(e); process.exit(1); });
