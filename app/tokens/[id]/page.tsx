'use client';

import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { useCoinBalance } from '@/lib/hooks/useCoins';
import { buyTokensTransaction, sellTokensTransaction } from '@/lib/sui/transactions';
import { formatAmount, parseAmount, getExplorerLink } from '@/lib/sui/client';
import { BONDING_CURVE } from '@/lib/constants';
import { calculateTokensOut, calculateSuiOut } from '@/lib/utils/bondingCurve';
import { toast } from 'sonner';
import { TradingViewChart } from '@/components/charts/TradingViewChart';
import { TradeHistory } from '@/components/charts/TradeHistory';

export default function TokenPage() {
  const params = useParams();
  const router = useRouter();
  const tokenId = params.id as string;
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  
  // Fetch token data
  const { data: tokensResponse, isLoading, refetch } = useQuery({
    queryKey: ['indexer-tokens'],
    queryFn: async () => {
      const response = await fetch('/api/proxy/tokens?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch tokens');
      return response.json();
    },
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
    staleTime: 1000, // Consider data stale after 1 second
  });
  
  const token = tokensResponse?.tokens?.find((t: any) => t.id === tokenId);
  
  // Handle graduated tokens
  useEffect(() => {
    if (token?.graduated && token?.cetusPoolAddress) {
      // Has pool - redirect to Cetus
      const cetusUrl = `https://app.cetus.zone/swap/?from=0x2::sui::SUI&to=${encodeURIComponent(token.coinType)}&poolAddress=${token.cetusPoolAddress}`;
      toast.info('Token graduated! Redirecting to Cetus...', { duration: 2000 });
      setTimeout(() => {
        window.location.href = cetusUrl;
      }, 2000);
    }
    // If graduated but no pool yet, show pending state (handled in render below)
  }, [token]);
  
  // Get user balances
  const { balance: paymentBalance, coins: paymentCoins, refetch: refetchPayment } = useCoinBalance();
  const { balance: memeBalance, coins: memeCoins, refetch: refetchMeme } = useCoinBalance(token?.coinType);
  
  // Calculate trade preview
  const tradePreview = useMemo(() => {
    if (!amount || !token || parseFloat(amount) <= 0) return null;
    
    const currentSupply = Number(token.curveSupply);
    const inputAmount = parseFloat(amount);
    
    if (mode === 'buy') {
      const tokensOut = calculateTokensOut(currentSupply, inputAmount);
      return { input: inputAmount, output: tokensOut };
    } else {
      const suiOut = calculateSuiOut(currentSupply, inputAmount);
      return { input: inputAmount, output: suiOut };
    }
  }, [amount, mode, token]);

  async function handleTrade() {
    if (!currentAccount || !token) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      if (mode === 'buy') {
        if (paymentCoins.length === 0) {
          toast.error('No SUILFG_MEMEFI tokens found. Get some from the faucet first.');
          return;
        }

        const amountInSmallest = parseAmount(amount, 9);
        if (BigInt(amountInSmallest) > BigInt(paymentBalance)) {
          toast.error(`Insufficient balance. You have ${formatAmount(paymentBalance, 9)} SUILFG`);
          return;
        }

        const tx = buyTokensTransaction({
          curveId: token.id,
          coinType: token.coinType,
          paymentCoinIds: paymentCoins.map(c => c.coinObjectId),
          maxSuiIn: amountInSmallest,
          minTokensOut: '0',
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              toast.success(`Bought ${token.ticker}!`, {
                action: {
                  label: 'View',
                  onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank'),
                },
              });
              setAmount('');
              // Refetch all data after small delay
              setTimeout(() => {
                refetch();
                refetchPayment();
                refetchMeme();
              }, 1000);
            },
            onError: (error) => {
              toast.error('Purchase failed: ' + error.message?.slice(0, 100));
            },
          }
        );
      } else {
        // Sell logic
        if (memeCoins.length === 0) {
          toast.error(`No ${token.ticker} tokens found`);
          return;
        }

        const validCoins = memeCoins.filter(c => BigInt(c.balance) > 0n);
        if (validCoins.length === 0) {
          toast.error('Your token balance is 0');
          return;
        }

        const amountInSmallest = parseAmount(amount, 9);
        if (BigInt(amountInSmallest) > BigInt(memeBalance)) {
          toast.error(`Insufficient balance. You have ${formatAmount(memeBalance, 9)} ${token.ticker}`);
          return;
        }

        const tx = sellTokensTransaction({
          curveId: token.id,
          coinType: token.coinType,
          memeTokenCoinIds: validCoins.map(c => c.coinObjectId),
          tokensToSell: amountInSmallest,
          minSuiOut: '0',
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              toast.success(`Sold ${token.ticker}!`, {
                action: {
                  label: 'View',
                  onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank'),
                },
              });
              setAmount('');
              // Refetch all data immediately instead of reloading
              setTimeout(() => {
                refetch();
                refetchPayment();
                refetchMeme();
              }, 1000); // Small delay to let transaction settle
            },
            onError: (error) => {
              toast.error('Sale failed: ' + error.message?.slice(0, 100));
            },
          }
        );
      }
    } catch (error: any) {
      toast.error('Transaction failed: ' + error.message);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-sui-dark">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">🔍</div>
            <h3 className="text-2xl font-bold">Loading...</h3>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-sui-dark">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-2xl font-bold mb-2">Token Not Found</h3>
            <button
              onClick={() => router.push('/tokens')}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Browse Tokens
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Show "Redirecting to Cetus" screen if graduated WITH pool
  if (token.graduated && token.cetusPoolAddress) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-sui-dark">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h3 className="text-2xl font-bold mb-4">Token Graduated!</h3>
            <p className="text-gray-300 mb-6">This token has graduated to Cetus DEX.</p>
            <p className="text-gray-400 mb-8">Redirecting you to trade on Cetus...</p>
            <div className="animate-spin inline-block w-8 h-8 border-4 border-meme-purple border-t-transparent rounded-full"></div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Show "Pool Creation Pending" screen if graduated WITHOUT pool
  if (token.graduated && !token.cetusPoolAddress) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-sui-dark">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎓</div>
            <h3 className="text-2xl font-bold mb-4">Token Graduated!</h3>
            <p className="text-gray-300 mb-4">
              This token completed its bonding curve and raised enough to graduate!
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 max-w-md mx-auto mb-6">
              <div className="text-yellow-400 font-semibold mb-2">⏳ Pool Creation in Progress</div>
              <p className="text-sm text-gray-300">
                Our team is creating a Cetus DEX pool for this token. 
                This usually takes 5-10 minutes.
              </p>
            </div>
            <p className="text-sm text-gray-400 mb-8">
              Trading will resume on Cetus DEX once the pool is ready.
              <br />
              This page will automatically update when ready.
            </p>
            <div className="flex items-center justify-center gap-2 text-meme-purple">
              <div className="animate-spin inline-block w-6 h-6 border-4 border-meme-purple border-t-transparent rounded-full"></div>
              <span className="text-sm">Checking for pool...</span>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const progress = (Number(token.curveSupply) / BONDING_CURVE.MAX_CURVE_SUPPLY) * 100;
  const userBalance = mode === 'buy' ? formatAmount(paymentBalance, 9) : formatAmount(memeBalance, 9);
  const tokenSymbol = mode === 'buy' ? 'SUILFG' : token.ticker;

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-sui-dark">
      <Header />
      
      {/* Back Button */}
      <div className="container mx-auto px-4 pt-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Hero Section - BIG Image + Info */}
        <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-3xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* BIG Token Image */}
            <div className="w-full md:w-48 h-48 md:h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-meme-pink/20 to-sui-blue/20 flex-shrink-0">
              {token.imageUrl ? (
                <img 
                  src={token.imageUrl} 
                  alt={token.ticker} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <span className="text-8xl">🚀</span>
                </div>
              )}
            </div>

            {/* Token Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">${token.ticker}</h1>
                  <p className="text-xl text-gray-300">{token.name}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied!');
                  }}
                  className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>

              {token.description && (
                <p className="text-gray-300 mb-4 line-clamp-3">{token.description}</p>
              )}

              {/* Social Links */}
              {(token.twitter || token.telegram || token.website) && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {token.twitter && (
                    <a
                      href={token.twitter.startsWith('http') ? token.twitter : `https://twitter.com/${token.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                      Twitter
                    </a>
                  )}
                  {token.telegram && (
                    <a
                      href={token.telegram.startsWith('http') ? token.telegram : `https://t.me/${token.telegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-400/20 hover:bg-blue-400/30 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      Telegram
                    </a>
                  )}
                  {token.website && (
                    <a
                      href={token.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                    >
                      🌐 Website
                    </a>
                  )}
                </div>
              )}

              {/* Price & Stats */}
              {token.currentPrice > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Current Price</div>
                    <div className="font-bold text-sm">{token.currentPrice.toFixed(10)} SUILFG</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">24h Change</div>
                    <div className={`font-bold text-sm ${token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">All-Time High</div>
                    <div className="font-bold text-sm">{token.allTimeHigh?.toFixed(10) || 'N/A'}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">All-Time Low</div>
                    <div className="font-bold text-sm">{token.allTimeLow?.toFixed(10) || 'N/A'}</div>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Bonding Curve Progress</span>
                  <span className="font-semibold">{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-meme-pink to-meme-purple transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {(737 - Number(token.curveSupply) / 1e6).toFixed(2)}M / 737M tokens available
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section - Full Width, No Boxes */}
        <div className="space-y-6 mb-6">
          <TradingViewChart coinType={token.coinType} />
          <TradeHistory coinType={token.coinType} />
        </div>

        {/* Trading Section - Compact & Not Sticky */}
        <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-4 md:p-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('buy')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all text-sm ${
                mode === 'buy'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setMode('sell')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all text-sm ${
                mode === 'sell'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Sell
            </button>
          </div>

          <div className="space-y-3">
            {/* Amount Input */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Amount ({tokenSymbol})</label>
                <button
                  onClick={() => setAmount(userBalance)}
                  className="text-xs text-meme-purple hover:text-meme-pink transition-colors"
                >
                  Max: {userBalance}
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-lg focus:border-meme-purple outline-none transition-colors"
              />
              
              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[25, 50, 75, 100].map(percent => (
                  <button
                    key={percent}
                    onClick={() => {
                      const rawBalance = mode === 'buy' 
                        ? Number(paymentBalance) / 1e9 
                        : Number(memeBalance) / 1e9;
                      setAmount(((rawBalance * percent) / 100).toFixed(4));
                    }}
                    className="py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors"
                  >
                    {percent}%
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {tradePreview && (
              <div className="bg-white/5 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">You {mode === 'buy' ? 'receive' : 'get'}</span>
                  <span className="font-bold">{tradePreview.output.toFixed(4)} {mode === 'buy' ? token.ticker : 'SUILFG'}</span>
                </div>
              </div>
            )}

            {/* Trade Button */}
            <button
              onClick={handleTrade}
              disabled={isPending || !currentAccount || !amount}
              className="w-full py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {isPending ? '⏳ Processing...' : !currentAccount ? 'Connect Wallet' : mode === 'buy' ? '💰 Buy' : '💸 Sell'}
            </button>
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
