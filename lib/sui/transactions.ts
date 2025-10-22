/**
 * Transaction building utilities
 */

import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { CONTRACTS, COIN_TYPES } from '../constants';

/**
 * Create a new memecoin by compiling on backend and publishing on frontend
 * User signs and pays gas
 */
export async function createCoinTransaction(params: {
  ticker: string;
  name: string;
  description: string;
}): Promise<{
  transaction: Transaction;
  moduleName: string;
  structName: string;
}> {
  // 1. Call compilation service (either Next.js API or standalone service)
  const compileEndpoint = process.env.NEXT_PUBLIC_COMPILE_API || '/api/compile-coin';
  const compileUrl = compileEndpoint.startsWith('http') 
    ? `${compileEndpoint}/compile`
    : compileEndpoint;
  
  const response = await fetch(compileUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to compile coin');
  }
  
  const { modules, dependencies, moduleName, structName } = await response.json();
  
  // 2. Build transaction
  const tx = new Transaction();
  
  // 2a. Publish the package and get UpgradeCap
  const [upgradeCap] = tx.publish({
    modules: modules.map((m: number[]) => new Uint8Array(m)),
    dependencies: dependencies,
  });
  
  // Transfer UpgradeCap to sender (they own the package!)
  tx.transferObjects([upgradeCap], tx.pure.address(await tx.pure.address('0x0'))); // Will be replaced by actual sender
  
  // Note: We can't create the curve in the same transaction because we need
  // the packageId, which we only get after publish executes.
  // User will need to sign twice: once to publish, once to create curve.
  
  return {
    transaction: tx,
    moduleName,
    structName,
  };
}

/**
 * Create bonding curve after package is published
 */
export function createCurveTransaction(params: {
  packageId: string;
  moduleName: string;
  structName: string;
  treasuryCapId: string;
  metadataId: string;
}): Transaction {
  const tx = new Transaction();
  
  const coinType = `${params.packageId}::${params.moduleName}::${params.structName}`;
  
  tx.moveCall({
    target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::create_new_meme_token`,
    typeArguments: [coinType],
    arguments: [
      tx.object(CONTRACTS.PLATFORM_STATE),
      tx.object('0x3bc08244a681e5fa1d125293ebd66c7017605d0c6d1820f4f9e5e1a7961a94e3'), // TickerRegistry
      tx.object(params.treasuryCapId),
      tx.object(params.metadataId),
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
