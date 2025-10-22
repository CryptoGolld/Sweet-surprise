/**
 * Transaction building utilities
 */

import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { CONTRACTS, COIN_TYPES } from '../constants';

/**
 * Create a new memecoin
 */
export function createCoinTransaction(params: {
  ticker: string;
  name: string;
  description: string;
  imageUrl: string;
  socials: string[];
}): Transaction {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::create_curve`,
    arguments: [
      tx.object(CONTRACTS.PLATFORM_STATE),
      tx.pure(bcs.string().serialize(params.ticker).toBytes()),
      tx.pure(bcs.string().serialize(params.name).toBytes()),
      tx.pure(bcs.string().serialize(params.description).toBytes()),
      tx.pure(bcs.string().serialize(params.imageUrl).toBytes()),
      tx.pure(bcs.vector(bcs.Address).serialize([]).toBytes()),
      tx.object('0x6'), // Clock
    ],
  });
  
  return tx;
}

/**
 * Buy tokens from bonding curve
 */
export function buyTokensTransaction(params: {
  curveId: string;
  paymentCoinId: string;
  amountIn: string;
  minOut: string;
  maxIn: string;
  recipient: string;
}): Transaction {
  const tx = new Transaction();
  
  const [receivedCoin] = tx.moveCall({
    target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::buy`,
    typeArguments: [COIN_TYPES.SUILFG_MEMEFI],
    arguments: [
      tx.object(params.curveId),
      tx.object(params.paymentCoinId),
      tx.pure(bcs.u64().serialize(params.amountIn).toBytes()),
      tx.pure(bcs.u64().serialize(params.minOut).toBytes()),
      tx.pure(bcs.u64().serialize(params.maxIn).toBytes()),
      tx.object('0x6'), // Clock
    ],
  });
  
  tx.transferObjects([receivedCoin], params.recipient);
  
  return tx;
}

/**
 * Sell tokens back to bonding curve
 */
export function sellTokensTransaction(params: {
  curveId: string;
  memeTokenCoinId: string;
  amountIn: string;
  minOut: string;
  recipient: string;
}): Transaction {
  const tx = new Transaction();
  
  const [receivedCoin] = tx.moveCall({
    target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::sell`,
    typeArguments: [COIN_TYPES.SUILFG_MEMEFI],
    arguments: [
      tx.object(params.curveId),
      tx.object(params.memeTokenCoinId),
      tx.pure(bcs.u64().serialize(params.amountIn).toBytes()),
      tx.pure(bcs.u64().serialize(params.minOut).toBytes()),
      tx.object('0x6'), // Clock
    ],
  });
  
  tx.transferObjects([receivedCoin], params.recipient);
  
  return tx;
}

/**
 * Graduate bonding curve
 */
export function graduateCurveTransaction(curveId: string): Transaction {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::try_graduate`,
    typeArguments: [COIN_TYPES.SUILFG_MEMEFI],
    arguments: [
      tx.object(curveId),
      tx.object('0x6'), // Clock
    ],
  });
  
  return tx;
}
