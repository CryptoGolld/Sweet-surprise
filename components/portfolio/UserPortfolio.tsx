'use client';

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { formatAmount } from '@/lib/sui/client';
import { COIN_TYPES, CONTRACTS } from '@/lib/constants';
import { useSuiPrice, formatUSD } from '@/lib/hooks/useSuiPrice';
import { calculateSpotPrice } from '@/lib/utils/bondingCurve';
import Link from 'next/link';

interface CoinWithMetadata {
  type: string;
  balance: string;
  symbol: string;
  name: string;
  iconUrl?: string;
  decimals: number;
}

export function UserPortfolio() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { data: suiPrice = 1.0 } = useSuiPrice();
  
  // Debug logs storage
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  // Store curve data separately
  const [curveData, setCurveData] = useState<Map<string, { curveSupply: string; curveId: string }>>(new Map());

  const { data: coins, isLoading, error: portfolioError } = useQuery({
    queryKey: ['user-portfolio', account?.address],
    queryFn: async (): Promise<CoinWithMetadata[]> => {
      if (!account?.address) return [];

      const logs: string[] = [];
      const log = (msg: string) => {
        console.log(msg);
        logs.push(msg);
        setDebugLogs(prev => [...prev, msg]);
      };
      
      try {
        log(`Starting query for ${account.address.slice(0, 10)}...`);
        
        // Get all coins owned by user
        const allCoins = await client.getAllCoins({
          owner: account.address,
        });
        
        log(`Found ${allCoins.data.length} coin objects`);
        
        if (allCoins.data.length === 0) {
          log('No coins found');
          return [];
        }

        // Group by coin type
        const coinMap = new Map<string, { balance: bigint; type: string }>();

        for (const coin of allCoins.data) {
          const existing = coinMap.get(coin.coinType) || { balance: 0n, type: coin.coinType };
          existing.balance += BigInt(coin.balance);
          coinMap.set(coin.coinType, existing);
        }

        const coinTypes = Array.from(coinMap.entries());
        log(`Processing ${coinTypes.length} unique coin types`);
        
        // Fetch metadata for all coins in parallel (simple and fast)
        const metadataPromises = coinTypes.map(([type]) =>
          client.getCoinMetadata({ coinType: type }).catch(() => null)
        );
        
        const metadataResults = await Promise.all(metadataPromises);
        log(`Fetched metadata: ${metadataResults.filter(m => m).length}/${coinTypes.length}`);
        
        // Build coin list
        const coinsWithMetadata: CoinWithMetadata[] = coinTypes.map(([type, data], i) => {
          const metadata = metadataResults[i];
          const parts = type.split('::');
          const symbol = metadata?.symbol || parts[parts.length - 1] || 'UNKNOWN';
          const name = (metadata?.name && metadata.name !== symbol) ? metadata.name : `${symbol} Token`;
          
          return {
            type,
            balance: data.balance.toString(),
            symbol,
            name,
            iconUrl: metadata?.iconUrl || undefined,
            decimals: metadata?.decimals || 9,
          };
        });

        log(`✅ Successfully processed ${coinsWithMetadata.length} coins`);
        return coinsWithMetadata;
      } catch (error: any) {
        log(`❌ ERROR: ${error.message}`);
        console.error('Portfolio query error:', error);
        throw new Error(`Failed at: ${logs[logs.length - 1] || 'unknown step'}`);
      }
    },
    enabled: !!account?.address,
    retry: 2, // Retry failed queries twice
    retryDelay: 1000, // Wait 1s between retries
    refetchInterval: 10000,
  });
  
  // Fetch curve data for owned tokens from indexer (runs after coins load)
  useEffect(() => {
    if (!coins || coins.length === 0) return;
    
    const fetchCurveData = async () => {
      const memeCoins = coins.filter(c => c.type !== COIN_TYPES.SUILFG_MEMEFI);
      if (memeCoins.length === 0) return;
      
      console.log(`Fetching curve data from indexer for ${memeCoins.length} tokens...`);
      
      try {
        // Fetch all tokens from indexer through proxy
        const response = await fetch('/api/proxy/tokens?limit=1000');
        if (!response.ok) throw new Error('Failed to fetch from indexer');
        
        const data = await response.json();
        const tokens = data.tokens || [];
        
        // Match owned coins with indexed tokens
        for (const coin of memeCoins) {
          const indexedToken = tokens.find((t: any) => t.coinType === coin.type);
          if (indexedToken) {
            setCurveData(prev => new Map(prev).set(coin.type, {
              curveSupply: indexedToken.curveSupply || '0',
              curveId: indexedToken.id,
            }));
          }
        }
        
        console.log(`✅ Loaded curve data from indexer for ${curveData.size} tokens`);
      } catch (error) {
        console.error('Failed to fetch curve data from indexer:', error);
      }
    };
    
    fetchCurveData();
  }, [coins]);


  if (!account) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <p className="text-gray-400">Connect your wallet to view your tokens</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded w-24" />
                  <div className="h-3 bg-white/10 rounded w-32" />
                </div>
              </div>
              <div className="h-6 bg-white/10 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }


  // Show error if portfolio query failed
  if (portfolioError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-2xl font-bold mb-2">Error Loading Portfolio</h3>
          <p className="text-gray-400 mb-4">{portfolioError.message}</p>
        </div>
        
        {/* Debug Logs */}
        <div className="text-xs font-mono bg-black/40 p-4 rounded text-left max-h-60 overflow-y-auto mb-4">
          <div className="text-green-400 mb-2">📋 Debug Log:</div>
          {debugLogs.length > 0 ? (
            debugLogs.map((log, i) => (
              <div key={i} className="text-gray-300">{log}</div>
            ))
          ) : (
            <div className="text-gray-500">No logs available</div>
          )}
        </div>
        
        <div className="text-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!coins || coins.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🪙</div>
          <h3 className="text-2xl font-bold mb-2">No Tokens Yet</h3>
          <p className="text-gray-400 mb-6">Start by claiming free tokens</p>
          <Link
            href="/faucet"
            className="inline-block px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            💧 Claim Tokens
          </Link>
        </div>
        
        {/* Debug Info */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-xs">
          <div className="font-bold mb-2">🔍 Debug Info:</div>
          <div className="space-y-1 font-mono text-yellow-200">
            <div>Wallet: {account?.address.slice(0, 20)}...</div>
            <div>Query Status: {isLoading ? 'Loading...' : 'Complete'}</div>
            <div>Coins Found: {coins?.length || 0}</div>
          </div>
          <div className="mt-3 text-yellow-300">
            If you have tokens but see 0, the query might be failing. Visit /debug page for more details.
          </div>
        </div>
      </div>
    );
  }

  // Calculate total portfolio value
  const totalPortfolioValue = coins.reduce((acc, coin) => {
    const isMainToken = coin.type === COIN_TYPES.SUILFG_MEMEFI;
    const balanceNum = Number(coin.balance) / Math.pow(10, coin.decimals);
    
    let totalValue = 0;
    if (isMainToken) {
      totalValue = balanceNum * suiPrice;
    } else {
      const curve = curveData.get(coin.type);
      if (curve) {
        const currentSupply = Number(curve.curveSupply);
        const pricePerToken = calculateSpotPrice(currentSupply) * suiPrice;
        totalValue = balanceNum * pricePerToken;
      }
    }
    
    return acc + totalValue;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Total Portfolio Value Card - Compact for Mobile */}
      <div className="relative overflow-hidden bg-gradient-to-br from-meme-pink/20 via-meme-purple/20 to-sui-blue/20 border border-white/20 rounded-2xl p-4 md:p-8 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-meme-pink/5 to-sui-blue/5 animate-pulse" />
        <div className="relative z-10">
          <div className="text-xs md:text-sm text-gray-400 mb-1 md:mb-2 font-semibold tracking-wide uppercase">Total Portfolio Value</div>
          <div className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-meme-pink via-meme-purple to-sui-blue bg-clip-text text-transparent animate-in fade-in duration-700">
            {formatUSD(totalPortfolioValue)}
          </div>
          <div className="mt-2 md:mt-4 flex items-center gap-2 md:gap-4 text-xs md:text-sm">
            <div className="flex items-center gap-1 md:gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-gray-400">{coins.length} Assets</span>
            </div>
            <div className="text-gray-500">•</div>
            <div className="text-gray-400">Live</div>
          </div>
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-3">
      {coins.map((coin) => {
        const isMainToken = coin.type === COIN_TYPES.SUILFG_MEMEFI;
        const balanceNum = Number(coin.balance) / Math.pow(10, coin.decimals);
        const tokenLink = '/tokens';
        
        // Calculate price per token
        let pricePerToken = 0;
        let totalValue = 0;
        
        const curve = curveData.get(coin.type);
        
        if (isMainToken) {
          // SUILFG_MEMEFI uses real-time SUI price
          pricePerToken = suiPrice;
          totalValue = balanceNum * suiPrice;
        } else if (curve) {
          // For meme tokens, calculate current spot price from bonding curve
          const currentSupply = Number(curve.curveSupply);
          
          if (currentSupply > 0 && !isNaN(currentSupply)) {
            pricePerToken = calculateSpotPrice(currentSupply) * suiPrice;
            totalValue = balanceNum * pricePerToken;
          } else {
            pricePerToken = calculateSpotPrice(0) * suiPrice;
            totalValue = balanceNum * pricePerToken;
          }
        }

        return (
          <Link
            key={coin.type}
            href={tokenLink}
            className="group relative block bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-3 md:p-4 hover:from-white/10 hover:to-white/5 hover:border-meme-purple/30 hover:shadow-lg hover:shadow-meme-purple/10 transition-all duration-300 animate-in slide-in-from-bottom cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-meme-pink/0 via-meme-purple/0 to-sui-blue/0 group-hover:from-meme-pink/5 group-hover:via-meme-purple/5 group-hover:to-sui-blue/5 rounded-xl transition-all duration-300" />
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                {/* Token Image - Smaller on Mobile */}
                {coin.iconUrl ? (
                  <img
                    src={coin.iconUrl}
                    alt={coin.symbol}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement!;
                      const emoji = isMainToken ? '💧' : '🪙';
                      parent.innerHTML = `<div class="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl md:text-2xl flex-shrink-0 ${isMainToken ? 'bg-gradient-to-br from-meme-pink to-meme-purple' : 'bg-white/10'}">${emoji}</div>`;
                    }}
                  />
                ) : (
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl md:text-2xl flex-shrink-0 ${isMainToken ? 'bg-gradient-to-br from-meme-pink to-meme-purple shadow-lg shadow-meme-purple/50' : 'bg-gradient-to-br from-white/10 to-white/5 backdrop-blur'} transition-all group-hover:scale-110`}>
                    {isMainToken ? '💧' : '🪙'}
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm md:text-lg truncate">{coin.name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {pricePerToken > 0 ? `$${pricePerToken.toFixed(6)}` : coin.symbol}
                  </div>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-sm md:text-lg">
                  {formatAmount(coin.balance, coin.decimals)}
                </div>
                <div className="text-xs text-gray-400">{coin.symbol}</div>
                {totalValue > 0 ? (
                  <div className="text-xs md:text-sm text-meme-purple font-semibold">
                    {formatUSD(totalValue)}
                  </div>
                ) : !isMainToken && !curveData.get(coin.type) ? (
                  <div className="text-xs text-gray-500 italic">
                    Loading...
                  </div>
                ) : null}
              </div>
            </div>
          </Link>
        );
      })}
      </div>
      
      {/* Quick Actions - More Compact on Mobile */}
      <div className="mt-4 md:mt-6 grid grid-cols-2 gap-2 md:gap-3">
        <Link
          href="/faucet"
          className="p-3 md:p-4 bg-white/5 border border-white/10 rounded-xl text-center hover:bg-white/10 transition-colors"
        >
          <div className="text-2xl md:text-3xl mb-1">💧</div>
          <div className="text-xs md:text-sm font-semibold">Claim More</div>
        </Link>
        <Link
          href="/tokens"
          className="p-3 md:p-4 bg-white/5 border border-white/10 rounded-xl text-center hover:bg-white/10 transition-colors"
        >
          <div className="text-2xl md:text-3xl mb-1">🔥</div>
          <div className="text-xs md:text-sm font-semibold">Trade</div>
        </Link>
      </div>
    </div>
  );
}
