/**
 * Combined PTB transactions for faster token launching
 * Allows users to publish + create curve + buy in fewer transactions
 */

import { Transaction } from '@mysten/sui/transactions';
import { CONTRACTS, COIN_TYPES } from '../constants';

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
  paymentCoinIds: string[];
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
  
  // PART 2: Merge payment coins if multiple
  let paymentCoin = tx.object(params.paymentCoinIds[0]);
  if (params.paymentCoinIds.length > 1) {
    tx.mergeCoins(
      paymentCoin,
      params.paymentCoinIds.slice(1).map(id => tx.object(id))
    );
  }
  
  // PART 3: Buy tokens immediately
  const deadline = Date.now() + 5 * 60 * 1000; // 5 minutes
  
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
