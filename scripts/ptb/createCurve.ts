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
  const TREA_CAP = process.env.TREASURY_CAP_T!; // TreasuryCap<T> object id
  const COIN_TYPE_T = process.env.COIN_TYPE_T!; // e.g. 0x...::mycoin::MY

  const M_NUM = Number(process.env.M_NUM ?? 0);
  const M_DEN = Number(process.env.M_DEN ?? 0);

  const txb = new TransactionBlock();

  if (M_NUM > 0 && M_DEN > 0) {
    txb.moveCall({
      target: `${PKG}::bonding_curve::create_new_meme_token_with_m`,
      typeArguments: [COIN_TYPE_T],
      arguments: [txb.object(CFG), txb.object(TREA_CAP), txb.pure(M_NUM), txb.pure(M_DEN)],
    });
  } else {
    txb.moveCall({
      target: `${PKG}::bonding_curve::create_new_meme_token`,
      typeArguments: [COIN_TYPE_T],
      arguments: [txb.object(CFG), txb.object(TREA_CAP)],
    });
  }

  const res = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: txb,
    options: { showObjectChanges: true },
  });
  console.log('✅ Curve created. Digest:', res.digest);
  const created = res.objectChanges?.filter(o => o.type === 'created') ?? [];
  for (const o of created) {
    if ((o as any).objectType?.includes('bonding_curve::BondingCurve')) {
      console.log('Curve ID:', (o as any).objectId);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
