/**
 * Combined PTB transactions for faster token launching
 * Allows users to publish + create curve + buy in fewer transactions
 */

import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { CONTRACTS, COIN_TYPES } from '../constants';
import type { PaymentCoinInput } from './transactions';

/**
 * STEP 2+3 COMBINED: Create bonding curve + Buy tokens in ONE transaction
 * 
 * This gives the creator a head start by letting them buy immediately
 * after creating the curve, all in a single atomic transaction.
 * 
 * NOTE: Step 1 (publish package) must still be separate because we need
 * the packageId from that transaction's result.
 */
export function createCurveAndBuyTransaction(params: {
  packageId: string;
  moduleName: string;
  structName: string;
  treasuryCapId: string;
  metadataId: string;
  // Buy parameters
  paymentCoinIds?: string[];
  paymentCoins?: PaymentCoinInput[];
  maxSuiIn: string;
  minTokensOut: string;
  referrerAddress?: string;
}): Transaction {
  const tx = new Transaction();
  
  const coinType = `${params.packageId}::${params.moduleName}::${params.structName}`;
  
  // PART 1: Create the bonding curve
  const curveResult = tx.moveCall({
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
  
  // Extract the created BondingCurve object from the result
  // The curve is the first returned object
  const curve = curveResult[0];
  
  // PART 2: Prepare payment coin
  // On mainnet (payment = SUI = gas), use tx.gas
  // On testnet (payment = SUILFG_MEMEFI), merge user's coins
  const isMainnet = COIN_TYPES.PAYMENT_TOKEN === COIN_TYPES.SUI;

  const providedCoins: PaymentCoinInput[] = params.paymentCoins
    ? [...params.paymentCoins]
    : (params.paymentCoinIds || []).map((coinObjectId) => ({ coinObjectId }));

  if (!isMainnet && providedCoins.length === 0) {
    throw new Error('No payment coins provided for createCurveAndBuyTransaction');
  }

  // Sort by balance when available to keep largest coins first
  providedCoins.sort((a, b) => {
    const balanceA = a.balance ? BigInt(a.balance) : 0n;
    const balanceB = b.balance ? BigInt(b.balance) : 0n;
    return balanceA === balanceB ? 0 : balanceA > balanceB ? -1 : 1;
  });

  let paymentCoin;

  if (isMainnet) {
    // Hint wallet which coins to use for gas if we have full metadata
    const gasPayments = providedCoins
      .filter((coin) => coin.digest && coin.version)
      .map((coin) => ({
        objectId: coin.coinObjectId,
        digest: coin.digest!,
        version: String(coin.version!),
      }));

    if (gasPayments.length > 0) {
      try {
        tx.setGasPayment(gasPayments);
      } catch (error) {
        console.warn('Failed to set gas payment hint (combined tx):', error);
      }
    }

    [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(params.maxSuiIn)]);
  } else {
    let mergedCoin = tx.object(providedCoins[0].coinObjectId);

    if (providedCoins.length > 1) {
      const remaining = providedCoins.slice(1).map((coin) => tx.object(coin.coinObjectId));
      tx.mergeCoins(mergedCoin, remaining);
    }

    [paymentCoin] = tx.splitCoins(mergedCoin, [tx.pure.u64(params.maxSuiIn)]);
  }
  
  // PART 3: Buy tokens immediately
  const deadline = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  console.log('?? Buy params:', {
    maxSuiIn: params.maxSuiIn,
    minTokensOut: params.minTokensOut,
    deadline,
    isMainnet,
  });
  
  tx.moveCall({
    target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::buy`,
    typeArguments: [coinType],
    arguments: [
      tx.object(CONTRACTS.PLATFORM_STATE),
      curve, // Use the curve we just created!
      paymentCoin,
      tx.pure.u64(params.maxSuiIn),
      tx.pure.u64(params.minTokensOut),
      tx.pure.u64(deadline),
      tx.object(CONTRACTS.REFERRAL_REGISTRY),
      tx.pure.option('address', params.referrerAddress),
      tx.object('0x6'), // Clock
    ],
  });
  
  return tx;
}

/**
 * Helper to check if user has enough balance for initial buy
 */
export async function canAffordInitialBuy(
  suiClient: any,
  userAddress: string,
  buyAmount: string
): Promise<{ canAfford: boolean; balance: string }> {
  try {
    const coins = await suiClient.getCoins({
      owner: userAddress,
      coinType: COIN_TYPES.PAYMENT_TOKEN,
    });
    
    const totalBalance = coins.data.reduce(
      (sum: bigint, coin: any) => sum + BigInt(coin.balance),
      0n
    );
    
    const requiredAmount = BigInt(buyAmount);
    
    return {
      canAfford: totalBalance >= requiredAmount,
      balance: totalBalance.toString(),
    };
  } catch (error) {
    console.error('Error checking balance:', error);
    return { canAfford: false, balance: '0' };
  }
}
