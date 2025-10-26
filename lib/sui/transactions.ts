/**
 * Transaction building utilities
 */

import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { SuiClient } from '@mysten/sui/client';
import { CONTRACTS, COIN_TYPES, getContractForCurve } from '../constants';

/**
 * Estimate gas for a transaction with a 30% safety buffer
 * Export this for advanced users who want manual control over gas estimation
 */
export async function estimateGasWithBuffer(
  tx: Transaction,
  client: SuiClient,
  sender: string
): Promise<string> {
  try {
    // Build transaction for dry run
    tx.setSender(sender);
    const dryRunTxBytes = await tx.build({ client });
    
    // Dry run to get gas estimate
    const dryRun = await client.dryRunTransactionBlock({
      transactionBlock: dryRunTxBytes,
    });
    
    if (dryRun.effects.status.status !== 'success') {
      console.warn('Dry run failed, using default gas budget');
      return '50000000'; // 0.05 SUI default
    }
    
    // Calculate total gas: computation + storage - rebate
    const computation = BigInt(dryRun.effects.gasUsed.computationCost);
    const storage = BigInt(dryRun.effects.gasUsed.storageCost);
    const rebate = BigInt(dryRun.effects.gasUsed.storageRebate);
    
    const totalGas = computation + storage - rebate;
    
    // Add 30% buffer for safety
    const gasWithBuffer = (totalGas * 130n) / 100n;
    
    console.log('⛽ Gas Estimation:', {
      computation: computation.toString(),
      storage: storage.toString(),
      total: totalGas.toString(),
      withBuffer: gasWithBuffer.toString(),
      inSUI: (Number(gasWithBuffer) / 1_000_000_000).toFixed(4),
    });
    
    return gasWithBuffer.toString();
  } catch (error) {
    console.warn('Gas estimation failed:', error);
    return '50000000'; // 0.05 SUI fallback
  }
}

/**
 * Create a new memecoin by compiling on backend and publishing on frontend
 * User signs and pays gas
 */
export async function createCoinTransaction(params: {
  ticker: string;
  name: string;
  description: string;
  senderAddress: string;
}): Promise<{
  transaction: Transaction;
  moduleName: string;
  structName: string;
}> {
  // 1. Call compilation service via Vercel proxy (avoids HTTPS->HTTP mixed content)
  const compileUrl = '/api/compile-proxy';
  
  const response = await fetch(compileUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  console.log('Compile response status:', response.status);
  console.log('Compile response ok:', response.ok);
  
  if (!response.ok) {
    let errorDetails;
    try {
      const error = await response.json();
      errorDetails = error.details || error.error || `HTTP ${response.status}`;
    } catch (e) {
      errorDetails = `HTTP ${response.status}: ${response.statusText}`;
    }
    console.error('Compilation failed:', errorDetails);
    throw new Error(errorDetails);
  }
  
  const result = await response.json();
  console.log('Compilation success:', { moduleName: result.moduleName, structName: result.structName });
  
  const { modules, dependencies, moduleName, structName } = result;
  
  // 2. Build transaction with explicit gas budget
  const tx = new Transaction();
  
  // Publishing is expensive, keep at 0.1 SUI
  tx.setGasBudget(100_000_000); // 0.1 SUI
  
  // 2a. Publish the package and get UpgradeCap
  const upgradeCap = tx.publish({
    modules: modules.map((m: number[]) => new Uint8Array(m)),
    dependencies: dependencies,
  });

  // Transfer UpgradeCap to sender (they own the package!)
  tx.transferObjects([upgradeCap], params.senderAddress);

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
  
  // Curve creation is more expensive, keep at 0.1 SUI
  tx.setGasBudget(100_000_000); // 0.1 SUI
  
  const coinType = `${params.packageId}::${params.moduleName}::${params.structName}`;
  
  tx.moveCall({
    target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::create_new_meme_token`,
    typeArguments: [coinType],
    arguments: [
      tx.object(CONTRACTS.PLATFORM_STATE),
      tx.object(CONTRACTS.TICKER_REGISTRY),
      tx.object(params.treasuryCapId),
      tx.object(params.metadataId),
      tx.object('0x6'), // Clock
    ],
  });
  
  return tx;
}

/**
 * Buy tokens from bonding curve
 * Gas is estimated automatically by the wallet - no need to set it
 */
export function buyTokensTransaction(params: {
  curveId: string;
  coinType: string;
  paymentCoinIds: string[]; // Array of payment coin object IDs
  maxSuiIn: string;
  minTokensOut: string;
}): Transaction {
  const tx = new Transaction();
  
  // Deadline: 5 minutes from now
  const deadlineMs = Date.now() + 300000;
  
  // Detect which contract this curve belongs to based on coinType
  const contractInfo = getContractForCurve(params.coinType);
  const { package: platformPackage, state, referralRegistry } = contractInfo;
  
  console.log('🔍 Buy Transaction - Contract Detection:', {
    coinType: params.coinType.substring(0, 80) + '...',
    detectedPackage: platformPackage,
    isLegacy: contractInfo.isLegacy,
  });
  
  // Merge all payment coins first if there are multiple
  let mergedCoin = tx.object(params.paymentCoinIds[0]);
  if (params.paymentCoinIds.length > 1) {
    const coinsToMerge = params.paymentCoinIds.slice(1).map(id => tx.object(id));
    tx.mergeCoins(mergedCoin, coinsToMerge);
  }
  
  // Split the payment amount from the merged coin
  // The Move function requires coin value <= max_sui_in (aborts if >)
  // It will handle refunds internally if not all is used
  const paymentCoin = tx.splitCoins(mergedCoin, [
    tx.pure.u64(params.maxSuiIn)
  ]);
  
  tx.moveCall({
    target: `${platformPackage}::bonding_curve::buy`,
    typeArguments: [params.coinType],
    arguments: [
      tx.object(state), // cfg: &PlatformConfig
      tx.object(params.curveId), // curve: &mut BondingCurve<T>
      tx.object(referralRegistry), // referral_registry: &mut ReferralRegistry
      paymentCoin, // payment: Coin<SUI>
      tx.pure.u64(params.maxSuiIn), // max_sui_in: u64
      tx.pure.u64(params.minTokensOut), // min_tokens_out: u64
      tx.pure.u64(deadlineMs), // deadline_ts_ms: u64
      tx.pure(bcs.option(bcs.Address).serialize(null).toBytes()), // referrer: Option<address>
      tx.object('0x6'), // clk: &Clock
    ],
  });
  
  // Note: buy is an entry function, tokens are auto-transferred to sender
  
  // Don't set gas budget - wallet SDK will estimate automatically
  // This provides the most accurate gas estimation without extra RPC calls
  // The wallet will dry-run the transaction to calculate exact gas needed
  
  return tx;
}

/**
 * Sell tokens back to bonding curve
 * Gas is estimated automatically by the wallet - no need to set it
 */
export function sellTokensTransaction(params: {
  curveId: string;
  coinType: string;
  memeTokenCoinIds: string[]; // Array of coin object IDs
  tokensToSell: string;
  minSuiOut: string;
}): Transaction {
  const tx = new Transaction();
  
  // Deadline: 5 minutes from now
  const deadlineMs = Date.now() + 300000;
  
  // Detect which contract this curve belongs to based on coinType
  const contractInfo = getContractForCurve(params.coinType);
  const { package: platformPackage, state, referralRegistry } = contractInfo;
  
  // Log transaction details for debugging
  console.log('🔍 Sell Transaction - Contract Detection:', {
    coinType: params.coinType.substring(0, 80) + '...',
    detectedPackage: platformPackage,
    isLegacy: contractInfo.isLegacy,
    numCoins: params.memeTokenCoinIds.length,
    tokensToSell: params.tokensToSell,
    minSuiOut: params.minSuiOut,
  });
  
  // Strategy: Create coin references, merge if needed, then pass to moveCall
  let coinArg;
  
  if (params.memeTokenCoinIds.length === 1) {
    // Single coin - use it directly
    coinArg = tx.object(params.memeTokenCoinIds[0]);
  } else {
    // Multiple coins - merge them all at once
    const [first, ...rest] = params.memeTokenCoinIds;
    coinArg = tx.object(first);
    const restObjects = rest.map(id => tx.object(id));
    
    // Merge all at once (not in a loop)
    tx.mergeCoins(coinArg, restObjects);
  }
  
  // IMPORTANT: The Move sell function expects amount_tokens in SMALLEST UNITS
  // The contract tracks token_supply in whole tokens internally
  // But amount_tokens parameter is in smallest units to match coin::value
  // The contract handles the conversion internally (divides by 1_000_000_000)
  
  const tokensInSmallestUnits = BigInt(params.tokensToSell);
  
  console.log('Sell amount:', {
    tokensInSmallestUnits: tokensInSmallestUnits.toString(),
    tokensInWholeUnits: (tokensInSmallestUnits / BigInt(1_000_000_000)).toString(),
  });
  
  // The Move sell function expects:
  // - mut tokens: Coin<T> - the coin to sell from (it handles splitting internally)
  // - amount_tokens: u64 - the amount to sell in SMALLEST UNITS (matches coin balance)
  // It will split if needed and return remainder to sender
  tx.moveCall({
    target: `${platformPackage}::bonding_curve::sell`,
    typeArguments: [params.coinType],
    arguments: [
      tx.object(state),
      tx.object(params.curveId),
      tx.object(referralRegistry), // referral_registry: &mut ReferralRegistry
      coinArg, // Pass the coin (single or merged)
      tx.pure.u64(tokensInSmallestUnits.toString()), // amount_tokens in SMALLEST UNITS!
      tx.pure.u64(params.minSuiOut),
      tx.pure.u64(deadlineMs),
      tx.pure(bcs.option(bcs.Address).serialize(null).toBytes()), // referrer: Option<address>
      tx.object('0x6'),
    ],
  });
  
  // Don't set gas budget - wallet SDK will estimate automatically
  // This provides the most accurate gas estimation without extra RPC calls
  // The wallet will dry-run the transaction to calculate exact gas needed
  
  return tx;
}

/**
 * Graduate bonding curve
 */
export function graduateCurveTransaction(curveId: string): Transaction {
  const tx = new Transaction();
  
  // Set gas budget: 0.1 SUI for graduation (100,000,000 MIST)
  tx.setGasBudget(100_000_000);
  
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
