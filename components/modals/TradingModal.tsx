'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { BondingCurve } from '@/lib/hooks/useBondingCurves';
import { useCoinBalance } from '@/lib/hooks/useCoins';
import { buyTokensTransaction, sellTokensTransaction } from '@/lib/sui/transactions';
import { formatAmount, parseAmount, calculatePercentage, getExplorerLink } from '@/lib/sui/client';
import { BONDING_CURVE } from '@/lib/constants';
import { useSuiPrice, formatUSD } from '@/lib/hooks/useSuiPrice';
import { 
  calculateTokensOut, 
  calculateSuiOut, 
  calculatePriceImpact,
  formatTokenAmount,
  calculateSpotPrice 
} from '@/lib/utils/bondingCurve';
import { toast } from 'sonner';
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
  
  // Calculate volume in USD (SUILFG_MEMEFI traded, not token count)
  // curve.curveBalance is in MIST (smallest units), so divide by 1e9
  const volumeInSUILFG = Number(curve.curveBalance) / 1e9;
  const volumeUsd = volumeInSUILFG * suiPrice;

  async function handleTrade() {
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
        // Validate payment balance
        if (paymentCoins.length === 0) {
          toast.error('No SUILFG_MEMEFI tokens found', {
            description: 'Get some from the faucet first',
          });
          return;
        }

        const amountInSmallest = parseAmount(amount, 9);
        const userBalanceBigInt = BigInt(paymentBalance);

        if (BigInt(amountInSmallest) > userBalanceBigInt) {
          toast.error('Insufficient balance', {
            description: `You only have ${formatAmount(paymentBalance, 9)} SUILFG`,
          });
          return;
        }

        // Build buy transaction - pass all coin IDs to merge them
        const tx = buyTokensTransaction({
          curveId: curve.id,
          coinType: curve.coinType,
          paymentCoinIds: paymentCoins.map(c => c.coinObjectId),
          maxSuiIn: amountInSmallest,
          minTokensOut: '0', // No minimum for now (can add slippage calculation)
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              toast.success('Purchase successful!', {
                description: `You bought ${curve.ticker}`,
                action: {
                  label: 'View',
                  onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank'),
                },
              });
              setAmount('');
              
              // Reload after delay
              setTimeout(() => window.location.reload(), 2000);
            },
            onError: (error) => {
              const errorMsg = error.message || '';
              if (errorMsg.includes('0x6')) {
                toast.error('Supply cap reached!', {
                  description: 'The bonding curve has sold out',
                });
              } else {
                toast.error('Purchase failed', {
                  description: errorMsg.slice(0, 100),
                });
              }
            },
          }
        );
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
              
              setTimeout(() => window.location.reload(), 2000);
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
  const tokenSymbol = mode === 'buy' ? 'SUILFG' : curve.ticker;
  
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
    ? "w-full" // Full page - no fixed positioning
    : "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200";
  
  const contentClasses = fullPage
    ? "bg-sui-dark w-full" // Full width for page, no border/rounded for full screen
    : "bg-sui-dark border-2 border-white/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"; // Modal size
  
  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {/* Header - Compact on full page */}
        <div className={`sticky top-0 bg-sui-dark border-b border-white/10 flex items-center justify-between ${fullPage ? 'p-3 md:p-4' : 'p-6'}`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-meme-pink/20 to-sui-blue/20 rounded-lg flex items-center justify-center text-3xl overflow-hidden">
              {curve.imageUrl ? (
                <img src={curve.imageUrl} alt={curve.ticker} className="w-full h-full object-cover" />
              ) : (
                '🚀'
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">${curve.ticker}</h2>
              <p className="text-gray-400">{curve.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Share this token"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Charts Section - Compact padding on full page */}
        <div className={`border-b border-white/10 ${fullPage ? 'p-3 md:p-4' : 'p-6'}`}>
          <div className="grid md:grid-cols-2 gap-3 md:gap-4">
            <PriceChart coinType={curve.coinType} />
            <TradeHistory coinType={curve.coinType} />
          </div>
        </div>

        <div className={`grid md:grid-cols-2 gap-4 md:gap-6 ${fullPage ? 'p-3 md:p-4' : 'p-6'}`}>
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
                  <span className="text-sui-blue font-bold">{formatAmount(curve.curveBalance, 9)} Ⓢ</span>
                </div>
                {curve.graduated && (
                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 text-center">
                    <span className="text-green-400 font-bold">🎓 Graduated!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="text-xs text-gray-400 space-y-1 bg-white/5 rounded-lg p-3">
              <p>• Fair launch bonding curve</p>
              <p>• {BONDING_CURVE.MAX_CURVE_SUPPLY.toLocaleString()} tokens on curve</p>
              <p>• Graduates at {BONDING_CURVE.TARGET_SUI.toLocaleString()} SUI</p>
              <p>• Auto-creates Cetus LP</p>
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
                ⚠️ This coin has graduated. Trading is now on Cetus DEX.
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
                <div className="text-sm font-semibold text-meme-purple mb-3">💎 Trade Preview</div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">You {mode === 'buy' ? 'pay' : 'sell'}:</span>
                    <span className="font-semibold">
                      {tradePreview.input.toFixed(2)} {mode === 'buy' ? 'SUILFG' : curve.ticker}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">You {mode === 'buy' ? 'receive' : 'get'}:</span>
                    <span className="font-bold text-white text-base">
                      {mode === 'buy' 
                        ? `${formatTokenAmount(tradePreview.output)} ${curve.ticker}`
                        : `${tradePreview.output.toFixed(4)} SUILFG`
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
                    ⚠️ High price impact! Consider a smaller amount.
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
                ? '⏳ Processing...'
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
