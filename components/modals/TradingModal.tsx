'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { BondingCurve } from '@/lib/hooks/useBondingCurves';
import { useCoinBalance } from '@/lib/hooks/useCoins';
import { buyTokensTransaction, sellTokensTransaction } from '@/lib/sui/transactions';
import { formatAmount, parseAmount, calculatePercentage, getExplorerLink } from '@/lib/sui/client';
import { BONDING_CURVE, getContractForCurve } from '@/lib/constants';
import { useSuiPrice, formatUSD } from '@/lib/hooks/useSuiPrice';
import { 
  calculateTokensOut, 
  calculateSuiOut, 
  calculatePriceImpact,
  formatTokenAmount,
  calculateSpotPrice 
} from '@/lib/utils/bondingCurve';
import { getPaymentTokenSymbol } from '@/lib/utils/networkText';
import { toast } from 'sonner';
import { debugLogger } from '@/lib/utils/debugLogger';
import { bcs } from '@mysten/sui/bcs';
import { getReferrerAddress } from '@/lib/utils/referrals';
import { PriceChart } from '@/components/charts/PriceChart';
import { TradeHistory } from '@/components/charts/TradeHistory';

interface TradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  curve: BondingCurve;
  fullPage?: boolean; // If true, renders as full page instead of modal overlay
}

export function TradingModal({ isOpen, onClose, curve, fullPage = false }: TradingModalProps) {
  const currentAccount = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: suiPrice = 1.0 } = useSuiPrice();
  
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  
  // Get user's payment token balance
  const { balance: paymentBalance, coins: paymentCoins } = useCoinBalance();
  
  // Get user's memecoin balance
  const { balance: memeBalance, coins: memeCoins } = useCoinBalance(curve.coinType);
  
  // Calculate trade preview
  const tradePreview = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return null;
    
    // NOTE: curve.curveSupply is already in whole tokens
    const currentSupply = Number(curve.curveSupply);
    const inputAmount = parseFloat(amount);
    
    if (mode === 'buy') {
      // Calculate how many tokens user will get
      const tokensOut = calculateTokensOut(currentSupply, inputAmount);
      const priceImpact = calculatePriceImpact(currentSupply, tokensOut);
      const costUsd = inputAmount * suiPrice;
      
      return {
        input: inputAmount,
        output: tokensOut,
        priceImpact,
        usdValue: costUsd,
      };
    } else {
      // Calculate how much SUI user will get
      const suiOut = calculateSuiOut(currentSupply, inputAmount);
      const priceImpact = calculatePriceImpact(currentSupply - inputAmount, inputAmount);
      const valueUsd = suiOut * suiPrice;
      
      return {
        input: inputAmount,
        output: suiOut,
        priceImpact: -priceImpact, // Negative because selling
        usdValue: valueUsd,
      };
    }
  }, [amount, mode, curve.curveSupply, suiPrice]);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // NOTE: curve.curveSupply is in WHOLE TOKENS, not smallest units
  const progress = calculatePercentage(
    curve.curveSupply,
    BONDING_CURVE.MAX_CURVE_SUPPLY.toString()
  );
  
  // Get 24h volume from indexed data (if available)
  // This comes from actual trades, not curve balance
  const volume24h = (curve as any).volume_24h_sui ? Number((curve as any).volume_24h_sui) / 1e9 : 0;
  const volumeUsd = volume24h * suiPrice;

  async function handleTrade() {
    debugLogger.debug('handleTrade called', { mode, amount, hasAccount: !!currentAccount });
    
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      if (mode === 'buy') {
        debugLogger.debug('Starting buy flow', { 
          amount, 
          paymentCoinsCount: paymentCoins.length,
          paymentBalance,
        });
        // Validate payment balance
        if (paymentCoins.length === 0) {
          const tokenSymbol = getPaymentTokenSymbol();
          const instructions = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' 
            ? 'Please fund your wallet with SUI'
            : 'Get some from the faucet first';
          toast.error(`No ${tokenSymbol} tokens found`, {
            description: instructions,
          });
          return;
        }

        const amountInSmallest = parseAmount(amount, 9);
        const userBalanceBigInt = BigInt(paymentBalance);

        if (BigInt(amountInSmallest) > userBalanceBigInt) {
          toast.error('Insufficient balance', {
            description: `You only have ${formatAmount(paymentBalance, 9)} ${getPaymentTokenSymbol()}`,
          });
          return;
        }

        // Select coins - use same pattern as working step 3
        // In step 3, they use ALL coins, so let's do the same
        // The wallet will automatically handle gas from available coins
        const selectedCoins = paymentCoins;
        
        // Debug: Log coin objects being used
        debugLogger.debug('Payment Coins', {
          count: selectedCoins.length,
          coins: selectedCoins.map(c => ({
            coinObjectId: c.coinObjectId,
            balance: c.balance,
            version: c.version,
            digest: c.digest,
          })),
          totalBalance: paymentBalance,
          amountNeeded: amountInSmallest,
        });

        // Build buy transaction
        const tx = buyTokensTransaction({
          curveId: curve.id,
          coinType: curve.coinType,
          paymentCoinIds: selectedCoins.map(c => c.coinObjectId),
          maxSuiIn: amountInSmallest,
          minTokensOut: '0', // No minimum for now (can add slippage calculation)
        });

        debugLogger.debug('Transaction ready, performing dry run first');

        try {
          // Get blockchain clock time FIRST to ensure accurate deadline
          // The Clock object doesn't expose timestamp directly, so we use a very large buffer
          // OR we can use the latest checkpoint to estimate time
          let blockchainTime = Date.now();
          try {
            // Try to get latest checkpoint timestamp as proxy for blockchain time
            const latestCheckpoint = await client.getLatestCheckpointSequenceNumber();
            debugLogger.debug('Got latest checkpoint', { checkpoint: latestCheckpoint });
            // Use client time with large buffer instead since we can't easily get clock time
            blockchainTime = Date.now();
          } catch (e) {
            debugLogger.warn('Could not get checkpoint, using client time', { error: e });
          }
          
          // Add very large buffer: 24 hours to account for any clock drift
          // This ensures the deadline is ALWAYS in the future, even if blockchain clock is way ahead
          const deadlineBuffer = 86400000; // 24 hours in milliseconds
          const calculatedDeadline = blockchainTime + deadlineBuffer;
          
          debugLogger.debug('Deadline calculation', {
            blockchainTime,
            clientTime: Date.now(),
            deadlineBuffer,
            calculatedDeadline,
            deadlineInHours: deadlineBuffer / 1000 / 60 / 60,
          });
          
          // Rebuild transaction with correct deadline using blockchain time
          debugLogger.debug('Rebuilding transaction with blockchain clock time');
          const txWithCorrectDeadline = buyTokensTransaction({
            curveId: curve.id,
            coinType: curve.coinType,
            paymentCoinIds: selectedCoins.map(c => c.coinObjectId),
            maxSuiIn: amountInSmallest,
            minTokensOut: '0',
          });
          
          // Manually override deadline in transaction before building
          // We need to rebuild with the correct deadline
          // Actually, transactions are immutable, so we need to recreate it
          
          // Perform dry run to catch errors before wallet signs
          if (currentAccount?.address) {
            debugLogger.debug('Building transaction for dry run', {
              sender: currentAccount.address,
              deadlineUsed: blockchainTime + 3600000,
            });
            
            // Create transaction with blockchain-based deadline
            const txForDryRun = new Transaction();
            let mergedCoinDR = txForDryRun.object(selectedCoins[0].coinObjectId);
            if (selectedCoins.length > 1) {
              txForDryRun.mergeCoins(mergedCoinDR, selectedCoins.slice(1).map(c => txForDryRun.object(c.coinObjectId)));
            }
            const [paymentCoinDR] = txForDryRun.splitCoins(mergedCoinDR, [txForDryRun.pure.u64(amountInSmallest)]);
            
            const contractInfo = getContractForCurve(curve.coinType);
            txForDryRun.moveCall({
              target: `${contractInfo.package}::bonding_curve::buy`,
              typeArguments: [curve.coinType],
              arguments: [
                txForDryRun.object(contractInfo.state),
                txForDryRun.object(curve.id),
                txForDryRun.object(contractInfo.referralRegistry),
                paymentCoinDR,
                txForDryRun.pure.u64(amountInSmallest),
                txForDryRun.pure.u64('0'),
                txForDryRun.pure.u64(calculatedDeadline), // Use calculated deadline with 2 hour buffer
                txForDryRun.pure(bcs.option(bcs.Address).serialize(getReferrerAddress())),
                txForDryRun.object('0x6'),
              ],
            });
            
            txForDryRun.setSender(currentAccount.address);
            const dryRunTxBytes = await txForDryRun.build({ client });
            
            debugLogger.debug('Dry run transaction bytes built, running dry run');
            
            try {
              const dryRunResult = await client.dryRunTransactionBlock({
                transactionBlock: dryRunTxBytes,
              });
              
              debugLogger.debug('Dry run completed', {
                status: dryRunResult.effects?.status?.status,
                error: dryRunResult.effects?.status?.error,
                gasUsed: dryRunResult.effects?.gasUsed,
              });
              
              if (dryRunResult.effects?.status?.status !== 'success') {
                const errorMsg = dryRunResult.effects?.status?.error || 'Dry run failed';
                debugLogger.error('Dry run failed before signing', {
                  status: dryRunResult.effects?.status?.status,
                  error: errorMsg,
                  fullEffects: dryRunResult.effects,
                });
                
                toast.error('Transaction validation failed', {
                  description: errorMsg,
                });
                return;
              }
              
              debugLogger.debug('Dry run successful, proceeding to wallet signing');
            } catch (dryRunError: any) {
              debugLogger.error('Dry run exception thrown', {
                error: dryRunError,
                errorMessage: dryRunError?.message,
                errorStack: dryRunError?.stack,
                fullError: JSON.stringify(dryRunError, Object.getOwnPropertyNames(dryRunError || {}), 2),
              });
              
              toast.error('Transaction validation failed', {
                description: dryRunError?.message || 'Failed to validate transaction',
              });
              return;
            }
          }

          debugLogger.debug('Dry run passed, creating fresh transaction for signing');

          // Create fresh transaction for signing with blockchain-based deadline
          // (blockchainTime was already fetched above)
          const txForSigning = new Transaction();
          let mergedCoinSign = txForSigning.object(selectedCoins[0].coinObjectId);
          if (selectedCoins.length > 1) {
            txForSigning.mergeCoins(mergedCoinSign, selectedCoins.slice(1).map(c => txForSigning.object(c.coinObjectId)));
          }
          const [paymentCoinSign] = txForSigning.splitCoins(mergedCoinSign, [txForSigning.pure.u64(amountInSmallest)]);
          
          const contractInfoSign = getContractForCurve(curve.coinType);
          txForSigning.moveCall({
            target: `${contractInfoSign.package}::bonding_curve::buy`,
            typeArguments: [curve.coinType],
            arguments: [
              txForSigning.object(contractInfoSign.state),
              txForSigning.object(curve.id),
              txForSigning.object(contractInfoSign.referralRegistry),
              paymentCoinSign,
              txForSigning.pure.u64(amountInSmallest),
              txForSigning.pure.u64('0'),
              txForSigning.pure.u64(calculatedDeadline), // Use calculated deadline with 2 hour buffer
              txForSigning.pure(bcs.option(bcs.Address).serialize(getReferrerAddress())),
              txForSigning.object('0x6'),
            ],
          });
          
          debugLogger.debug('Fresh transaction created with blockchain time deadline');

          debugLogger.debug('Fresh transaction created, attempting to sign and execute');

          signAndExecute(
            { transaction: txForSigning },
            {
              onSuccess: (result) => {
                debugLogger.debug('Buy transaction succeeded', {
                  digest: result.digest,
                });
                toast.success('Purchase successful!', {
                  description: `You bought ${curve.ticker}`,
                  action: {
                    label: 'View',
                    onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank'),
                  },
                });
                setAmount('');
                
                // Close modal instead of reloading - parent will refetch automatically
                setTimeout(() => onClose(), 1500);
              },
              onError: (error: any) => {
                const errorMsg = error?.message || String(error) || 'Unknown error';
                
                // Log to both debugLogger and console to ensure we capture it
                console.error('?? BUY ERROR:', error);
                console.error('?? Error message:', errorMsg);
                console.error('?? Full error:', JSON.stringify(error, null, 2));
                
                try {
                  debugLogger.error('Buy transaction failed in onError handler', { 
                    error,
                    errorMessage: errorMsg,
                    errorName: error?.name,
                    errorStack: error?.stack,
                    errorToString: String(error),
                    fullError: JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2),
                  });
                } catch (logError) {
                  console.error('Failed to log to debugLogger:', logError);
                }
              
              // Parse common Move abort codes
              let userMessage = 'Purchase failed';
              let description = errorMsg.slice(0, 150);
              
              if (errorMsg.includes('could not automatically determine a budget') || errorMsg.includes('Dry run failed')) {
                userMessage = 'Transaction failed';
                description = 'Gas estimation failed. This should be fixed now - please try again. If the issue persists, check your wallet balance.';
              } else if (errorMsg.includes('0x6')) {
                userMessage = 'Supply cap reached!';
                description = 'The bonding curve has sold out';
              } else if (errorMsg.includes('E_DEADLINE_EXPIRED') || errorMsg.includes('abort 4')) {
                userMessage = 'Transaction expired';
                description = 'Please try again';
              } else if (errorMsg.includes('E_MAX_IN_EXCEEDED') || errorMsg.includes('abort 5')) {
                userMessage = 'Amount exceeds limit';
                description = 'Try a smaller amount';
              } else if (errorMsg.includes('MoveAbort') || errorMsg.includes('abort')) {
                // Better handling for Move abort errors
                userMessage = 'Transaction failed';
                description = errorMsg.includes('Module') 
                  ? 'Contract error occurred. Check console for details.'
                  : errorMsg.slice(0, 100);
              }
              
              toast.error(userMessage, {
                description,
                duration: 10000,
                action: {
                  label: '?? Copy Error',
                  onClick: () => {
                    navigator.clipboard.writeText(JSON.stringify({error: errorMsg, full: error}, null, 2));
                    toast.success('Error copied!');
                  },
                },
              });
            },
          }
          );
        } catch (error: any) {
          debugLogger.error('Buy transaction failed in try-catch', {
            error,
            errorMessage: error?.message,
            errorName: error?.name,
            errorStack: error?.stack,
            errorToString: String(error),
            errorType: typeof error,
            isError: error instanceof Error,
            fullError: JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2),
          });
          toast.error('Transaction failed', {
            description: error?.message || 'Unknown error occurred',
          });
        }
      } else {
        // Sell mode
        if (memeCoins.length === 0) {
          toast.error(`No ${curve.ticker} tokens found`, {
            description: 'You need to buy some first',
          });
          return;
        }
        
        // Filter out coins with 0 balance
        const validCoins = memeCoins.filter(c => BigInt(c.balance) > 0n);
        
        if (validCoins.length === 0) {
          toast.error(`No ${curve.ticker} tokens with balance found`, {
            description: 'Your coin balance is 0',
          });
          return;
        }

        const amountInSmallest = parseAmount(amount, 9);
        const userBalanceBigInt = BigInt(memeBalance);
        
        // Calculate total balance from valid coins
        const totalCoinBalance = validCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);

        if (BigInt(amountInSmallest) > userBalanceBigInt) {
          toast.error('Insufficient balance', {
            description: `You only have ${formatAmount(memeBalance, 9)} ${curve.ticker}`,
          });
          return;
        }
        
        // Additional check: ensure the amount is positive and valid
        if (BigInt(amountInSmallest) <= 0n) {
          toast.error('Invalid amount', {
            description: 'Please enter a valid amount to sell',
          });
          return;
        }

        // Verify the amount is within the available balance
        if (BigInt(amountInSmallest) > totalCoinBalance) {
          toast.error('Insufficient coin balance', {
            description: `Total in coins: ${formatAmount(totalCoinBalance.toString(), 9)}, Trying to sell: ${amount}`,
          });
          console.error('Balance mismatch:', {
            reported: memeBalance,
            actual: totalCoinBalance.toString(),
            trying: amountInSmallest,
          });
          return;
        }

        console.log('Sell transaction details:', {
          amount,
          amountInSmallest,
          memeBalance,
          totalCoinBalance: totalCoinBalance.toString(),
          numCoins: validCoins.length,
          coinBalances: validCoins.map(c => c.balance),
          coinIds: validCoins.map(c => c.coinObjectId),
          match: amountInSmallest === totalCoinBalance.toString(),
        });

        // Build sell transaction - pass valid coin IDs only
        const tx = sellTokensTransaction({
          curveId: curve.id,
          coinType: curve.coinType,
          memeTokenCoinIds: validCoins.map(c => c.coinObjectId),
          tokensToSell: amountInSmallest,
          minSuiOut: '0',
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              toast.success('Sold successfully!', {
                description: `You sold ${curve.ticker}`,
                action: {
                  label: 'View',
                  onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank'),
                },
              });
              setAmount('');
              
              // Close modal instead of reloading - parent will refetch automatically
              setTimeout(() => onClose(), 1500);
            },
            onError: (error) => {
              toast.error('Sale failed', {
                description: error.message?.slice(0, 100),
              });
            },
          }
        );
      }
    } catch (error: any) {
      toast.error('Transaction failed', {
        description: error.message,
      });
    }
  }

  const userBalance = mode === 'buy' ? formatAmount(paymentBalance, 9) : formatAmount(memeBalance, 9);
  const tokenSymbol = mode === 'buy' ? getPaymentTokenSymbol() : curve.ticker;
  
  // Raw balance values for percentage calculations (not formatted)
  const rawBalance = mode === 'buy' 
    ? Number(paymentBalance) / 1e9 
    : Number(memeBalance) / 1e9;

  function handleShare() {
    const url = `${window.location.origin}/tokens/${curve.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied!', {
        description: 'Share this link with others to trade this token',
      });
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  }

  // Render as full page or modal overlay based on fullPage prop
  const containerClasses = fullPage
    ? "w-full min-h-screen" // Full page - takes full height
    : "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200";
  
  const contentClasses = fullPage
    ? "bg-sui-dark w-full min-h-screen" // Full screen for page
    : "bg-sui-dark border-2 border-white/20 rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"; // Modal size
  
  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {/* Header - Compact on full page */}
        <div className={`sticky top-0 bg-sui-dark/95 backdrop-blur-sm border-b border-white/10 flex items-center justify-between z-10 ${fullPage ? 'p-4 md:p-6' : 'p-6'}`}>
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-meme-pink/20 to-sui-blue/20 rounded-lg flex items-center justify-center text-2xl md:text-3xl overflow-hidden flex-shrink-0">
              {curve.imageUrl ? (
                <img src={curve.imageUrl} alt={curve.ticker} className="w-full h-full object-cover" />
              ) : (
                '??'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl md:text-2xl font-bold truncate">${curve.ticker}</h2>
              <p className="text-gray-400 text-sm truncate">{curve.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <button
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Share this token"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            {!fullPage && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl transition-colors p-1"
              >
                ?
              </button>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className={`border-b border-white/10 ${fullPage ? 'p-4 md:p-6' : 'p-6'}`}>
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            <PriceChart coinType={curve.coinType} />
            <TradeHistory coinType={curve.coinType} />
          </div>
        </div>

        <div className={`grid lg:grid-cols-2 gap-4 md:gap-6 ${fullPage ? 'p-4 md:p-6' : 'p-6'}`}>
          {/* Left: Info */}
          <div className="space-y-6">
            {/* Description */}
            {curve.description && (
              <div>
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-gray-300 text-sm">{curve.description}</p>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Bonding Curve Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Progress</span>
                  <span className="font-bold text-sui-blue">{progress.toFixed(2)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-meme-pink via-meme-purple to-sui-blue transition-all duration-300"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tokens Sold</span>
                  <span>{Number(curve.curveSupply).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Max Supply (Curve)</span>
                  <span>{BONDING_CURVE.MAX_CURVE_SUPPLY.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">24h Volume</span>
                  <span className="text-meme-purple font-bold">{formatUSD(volumeUsd)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">SUI Collected</span>
                  <span className="text-sui-blue font-bold">{formatAmount(curve.curveBalance, 9)} ?</span>
                </div>
                {curve.graduated && (
                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 text-center">
                    <span className="text-green-400 font-bold">?? Graduated!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="text-xs text-gray-400 space-y-1 bg-white/5 rounded-lg p-3">
              <p>? Fair launch bonding curve</p>
              <p>? {BONDING_CURVE.MAX_CURVE_SUPPLY.toLocaleString()} tokens on curve</p>
              <p>? Graduates at {BONDING_CURVE.TARGET_SUI.toLocaleString()} SUI</p>
              <p>? Auto-creates Cetus LP</p>
            </div>
          </div>

          {/* Right: Trading */}
          <div className="space-y-6">
            {/* Mode selector */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
              <button
                onClick={() => setMode('buy')}
                disabled={curve.graduated}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  mode === 'buy'
                    ? 'bg-green-500 text-white'
                    : 'text-gray-400 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Buy
              </button>
              <button
                onClick={() => setMode('sell')}
                disabled={curve.graduated}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  mode === 'sell'
                    ? 'bg-red-500 text-white'
                    : 'text-gray-400 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Sell
              </button>
            </div>

            {curve.graduated && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-400">
                ?? This coin has graduated. Trading is now on Cetus DEX.
              </div>
            )}

            {/* Amount input */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold">
                  Amount ({tokenSymbol})
                </label>
                {currentAccount && (
                  <button
                    onClick={() => setAmount(userBalance)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Balance: {userBalance}
                  </button>
                )}
              </div>
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={curve.graduated}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none text-lg transition-colors disabled:opacity-50"
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {mode === 'buy' ? (
                  // Buy mode: Quick amount buttons in SUI
                  [10, 50, 100, 500].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset.toString())}
                      disabled={curve.graduated}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors disabled:opacity-50"
                    >
                      {preset}
                    </button>
                  ))
                ) : (
                  // Sell mode: Percentage buttons
                  [
                    { label: '25%', value: 0.25 },
                    { label: '50%', value: 0.5 },
                    { label: '100%', value: 1.0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        if (!isNaN(rawBalance) && rawBalance > 0) {
                          const calculatedAmount = rawBalance * preset.value;
                          // Set the amount with proper precision
                          setAmount(calculatedAmount.toString());
                        }
                      }}
                      disabled={curve.graduated || rawBalance === 0}
                      className="px-3 py-1 bg-gradient-to-r from-meme-purple/20 to-sui-blue/20 hover:from-meme-purple/30 hover:to-sui-blue/30 border border-meme-purple/30 rounded text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {preset.label}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Trade Preview */}
            {tradePreview && (
              <div className="bg-gradient-to-br from-meme-purple/10 to-sui-blue/10 border border-meme-purple/30 rounded-lg p-4">
                <div className="text-sm font-semibold text-meme-purple mb-3">?? Trade Preview</div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">You {mode === 'buy' ? 'pay' : 'sell'}:</span>
                    <span className="font-semibold">
                      {tradePreview.input.toFixed(2)} {mode === 'buy' ? getPaymentTokenSymbol() : curve.ticker}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">You {mode === 'buy' ? 'receive' : 'get'}:</span>
                    <span className="font-bold text-white text-base">
                      {mode === 'buy' 
                        ? `${formatTokenAmount(tradePreview.output)} ${curve.ticker}`
                        : `${tradePreview.output.toFixed(4)} ${getPaymentTokenSymbol()}`
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">USD Value:</span>
                    <span className="font-semibold text-meme-purple">
                      {formatUSD(tradePreview.usdValue)}
                    </span>
                  </div>
                  
                  <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                    <span className="text-gray-400">Price Impact:</span>
                    <span className={`font-semibold ${
                      Math.abs(tradePreview.priceImpact) > 5 
                        ? 'text-red-400' 
                        : Math.abs(tradePreview.priceImpact) > 2 
                        ? 'text-yellow-400' 
                        : 'text-green-400'
                    }`}>
                      {tradePreview.priceImpact > 0 ? '+' : ''}{tradePreview.priceImpact.toFixed(2)}%
                    </span>
                  </div>
                </div>
                
                {Math.abs(tradePreview.priceImpact) > 5 && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                    ?? High price impact! Consider a smaller amount.
                  </div>
                )}
              </div>
            )}

            {/* Trade button */}
            <button
              onClick={handleTrade}
              disabled={isPending || !currentAccount || !amount || parseFloat(amount) <= 0 || curve.graduated}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                mode === 'buy'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              } disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100`}
            >
              {!currentAccount
                ? 'Connect Wallet'
                : curve.graduated
                ? 'Graduated - Use Cetus'
                : isPending
                ? '? Processing...'
                : `${mode === 'buy' ? 'Buy' : 'Sell'} ${curve.ticker}`}
            </button>

            <p className="text-xs text-center text-gray-400">
              Trade at your own risk. This is testnet only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
