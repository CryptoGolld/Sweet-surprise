'use client';

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { formatAmount } from '@/lib/sui/client';
import { COIN_TYPES } from '@/lib/constants';
import { useSuiPrice, formatUSD } from '@/lib/hooks/useSuiPrice';
import { useBondingCurves } from '@/lib/hooks/useBondingCurves';
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
  const { data: bondingCurves = [] } = useBondingCurves();

  const { data: coins, isLoading, refetch } = useQuery({
    queryKey: ['user-portfolio', account?.address, bondingCurves],
    queryFn: async (): Promise<CoinWithMetadata[]> => {
      if (!account?.address) return [];

      // Get all coins owned by user
      const allCoins = await client.getAllCoins({
        owner: account.address,
      });

      // Group by coin type
      const coinMap = new Map<string, { balance: bigint; type: string }>();

      for (const coin of allCoins.data) {
        const existing = coinMap.get(coin.coinType) || { balance: 0n, type: coin.coinType };
        existing.balance += BigInt(coin.balance);
        coinMap.set(coin.coinType, existing);
      }

      // Fetch metadata for each coin type
      const coinsWithMetadata: CoinWithMetadata[] = [];
      
      for (const [type, data] of coinMap.entries()) {
        try {
          // Try to get coin metadata
          const metadata = await client.getCoinMetadata({ coinType: type });
          
          // Check if this coin has a bonding curve (for image URL)
          const curve = bondingCurves.find(c => c.coinType === type);
          
          // Use ticker as name if name is empty or same as ticker (for memecoins)
          const symbol = metadata?.symbol || curve?.ticker || type.split('::').pop() || 'UNKNOWN';
          const name = metadata?.name && metadata.name !== symbol ? metadata.name : (curve?.name && curve.name !== symbol ? curve.name : `${symbol} Token`);
          
          coinsWithMetadata.push({
            type,
            balance: data.balance.toString(),
            symbol,
            name,
            iconUrl: curve?.imageUrl || metadata?.iconUrl || undefined,
            decimals: metadata?.decimals || 9,
          });
        } catch (error) {
          // If metadata fetch fails, use default values
          const parts = type.split('::');
          const curve = bondingCurves.find(c => c.coinType === type);
          
          // Use ticker as name if name is empty or same as ticker (for memecoins)
          const symbol = curve?.ticker || parts[parts.length - 1] || 'UNKNOWN';
          const name = curve?.name && curve.name !== symbol ? curve.name : `${symbol} Token`;
          
          coinsWithMetadata.push({
            type,
            balance: data.balance.toString(),
            symbol,
            name,
            iconUrl: curve?.imageUrl || undefined,
            decimals: 9,
          });
        }
      }

      return coinsWithMetadata;
    },
    enabled: !!account?.address,
    refetchInterval: 10000,
  });

  // Refetch portfolio when bonding curves finish loading
  useEffect(() => {
    if (bondingCurves && bondingCurves.length > 0 && coins) {
      // Check if any coins are missing price data
      const hasMissingPrices = coins.some(coin => {
        const isMainToken = coin.type === COIN_TYPES.SUILFG_MEMEFI;
        const curve = bondingCurves.find(c => c.coinType === coin.type);
        return !isMainToken && !curve;
      });
      
      if (hasMissingPrices) {
        // Refetch to update with new curve data
        setTimeout(() => refetch(), 1000);
      }
    }
  }, [bondingCurves, coins, refetch]);

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

  if (!coins || coins.length === 0) {
    return (
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
    );
  }

  // Calculate total portfolio value
  const totalPortfolioValue = coins.reduce((acc, coin) => {
    const isMainToken = coin.type === COIN_TYPES.SUILFG_MEMEFI;
    const balanceNum = Number(coin.balance) / Math.pow(10, coin.decimals);
    const curve = bondingCurves.find(c => c.coinType === coin.type);
    
    let totalValue = 0;
    if (isMainToken) {
      totalValue = balanceNum * suiPrice;
    } else if (curve) {
      // NOTE: curve.curveSupply is already in whole tokens from contract
      const currentSupply = Number(curve.curveSupply);
      const pricePerToken = calculateSpotPrice(currentSupply) * suiPrice;
      totalValue = balanceNum * pricePerToken;
    }
    
    return acc + totalValue;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Total Portfolio Value Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-meme-pink/20 via-meme-purple/20 to-sui-blue/20 border border-white/20 rounded-2xl p-8 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-meme-pink/5 to-sui-blue/5 animate-pulse" />
        <div className="relative z-10">
          <div className="text-sm text-gray-400 mb-2 font-semibold tracking-wide uppercase">Total Portfolio Value</div>
          <div className="text-5xl font-bold bg-gradient-to-r from-meme-pink via-meme-purple to-sui-blue bg-clip-text text-transparent animate-in fade-in duration-700">
            {formatUSD(totalPortfolioValue)}
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-gray-400">{coins.length} Assets</span>
            </div>
            <div className="text-gray-500">•</div>
            <div className="text-gray-400">Live Prices</div>
          </div>
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-3">
      {coins.map((coin) => {
        const isMainToken = coin.type === COIN_TYPES.SUILFG_MEMEFI;
        const balanceNum = Number(coin.balance) / Math.pow(10, coin.decimals);
        
        // Find bonding curve data for this token to get current price
        const curve = bondingCurves.find(c => c.coinType === coin.type);
        const tokenLink = curve ? `/tokens/${curve.id}` : '/tokens';
        
        // Calculate price per token
        let pricePerToken = 0;
        let totalValue = 0;
        
        if (isMainToken) {
          // SUILFG_MEMEFI uses real-time SUI price
          pricePerToken = suiPrice;
          totalValue = balanceNum * suiPrice;
        } else if (curve) {
          // For meme tokens, calculate current spot price from bonding curve
          // NOTE: curve.curveSupply is already in whole tokens from contract
          const currentSupply = Number(curve.curveSupply);
          
          // Only calculate if supply is valid
          if (currentSupply > 0 && !isNaN(currentSupply)) {
            pricePerToken = calculateSpotPrice(currentSupply) * suiPrice; // Convert to USD
            totalValue = balanceNum * pricePerToken;
          } else {
            // For newly created tokens with 0 supply, use base price
            pricePerToken = calculateSpotPrice(0) * suiPrice;
            totalValue = balanceNum * pricePerToken;
          }
        } else {
          // No curve found - might be loading or not a platform token
          console.log('No curve found for token:', coin.type, 'Symbol:', coin.symbol);
        }

        return (
          <Link
            key={coin.type}
            href={tokenLink}
            className="group relative block bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-4 hover:from-white/10 hover:to-white/5 hover:border-meme-purple/30 hover:shadow-lg hover:shadow-meme-purple/10 transition-all duration-300 animate-in slide-in-from-bottom cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-meme-pink/0 via-meme-purple/0 to-sui-blue/0 group-hover:from-meme-pink/5 group-hover:via-meme-purple/5 group-hover:to-sui-blue/5 rounded-xl transition-all duration-300" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Token Image */}
                {coin.iconUrl ? (
                  <img
                    src={coin.iconUrl}
                    alt={coin.symbol}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement!;
                      const emoji = isMainToken ? '💧' : '🪙';
                      parent.innerHTML = `<div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isMainToken ? 'bg-gradient-to-br from-meme-pink to-meme-purple' : 'bg-white/10'}">${emoji}</div>`;
                    }}
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isMainToken ? 'bg-gradient-to-br from-meme-pink to-meme-purple shadow-lg shadow-meme-purple/50' : 'bg-gradient-to-br from-white/10 to-white/5 backdrop-blur'} transition-all group-hover:scale-110`}>
                    {isMainToken ? '💧' : '🪙'}
                  </div>
                )}
                
                <div>
                  <div className="font-bold text-lg">{coin.name}</div>
                  <div className="text-xs text-gray-400">
                    {pricePerToken > 0 ? `$${pricePerToken.toFixed(6)} per ${coin.symbol}` : coin.symbol}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-lg">
                  {formatAmount(coin.balance, coin.decimals)} {coin.symbol}
                </div>
                {totalValue > 0 ? (
                  <div className="text-sm text-meme-purple font-semibold">
                    {formatUSD(totalValue)}
                  </div>
                ) : !isMainToken && !curve ? (
                  <div className="text-xs text-gray-500 italic">
                    Loading price...
                  </div>
                ) : null}
                {curve && (
                  <div className="text-xs text-sui-blue group-hover:underline">
                    Trade →
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
      </div>
      
      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link
          href="/faucet"
          className="p-4 bg-white/5 border border-white/10 rounded-xl text-center hover:bg-white/10 transition-colors"
        >
          <div className="text-3xl mb-1">💧</div>
          <div className="text-sm font-semibold">Claim More</div>
        </Link>
        <Link
          href="/tokens"
          className="p-4 bg-white/5 border border-white/10 rounded-xl text-center hover:bg-white/10 transition-colors"
        >
          <div className="text-3xl mb-1">🔥</div>
          <div className="text-sm font-semibold">Trade</div>
        </Link>
      </div>
    </div>
  );
}
