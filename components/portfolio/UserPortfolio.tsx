'use client';

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { formatAmount } from '@/lib/sui/client';
import { COIN_TYPES } from '@/lib/constants';
import { useSuiPrice, formatUSD } from '@/lib/hooks/useSuiPrice';
import { useBondingCurves } from '@/lib/hooks/useBondingCurves';
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

  const { data: coins, isLoading } = useQuery({
    queryKey: ['user-portfolio', account?.address],
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
          
          coinsWithMetadata.push({
            type,
            balance: data.balance.toString(),
            symbol: metadata?.symbol || curve?.ticker || type.split('::').pop() || 'UNKNOWN',
            name: metadata?.name || curve?.name || 'Unknown Token',
            iconUrl: curve?.imageUrl || metadata?.iconUrl || undefined,
            decimals: metadata?.decimals || 9,
          });
        } catch (error) {
          // If metadata fetch fails, use default values
          const parts = type.split('::');
          const curve = bondingCurves.find(c => c.coinType === type);
          
          coinsWithMetadata.push({
            type,
            balance: data.balance.toString(),
            symbol: curve?.ticker || parts[parts.length - 1] || 'UNKNOWN',
            name: curve?.name || parts[parts.length - 1] || 'Unknown Token',
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

  return (
    <div className="space-y-3">
      {coins.map((coin) => {
        const isMainToken = coin.type === COIN_TYPES.SUILFG_MEMEFI;
        const balanceNum = Number(coin.balance) / Math.pow(10, coin.decimals);
        
        // For SUILFG_MEMEFI, use real-time SUI price
        // For other tokens, show balance only (no USD value yet)
        const pricePerToken = isMainToken ? suiPrice : 0;
        const totalValue = isMainToken ? balanceNum * suiPrice : 0;

        return (
          <div
            key={coin.type}
            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between">
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
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isMainToken ? 'bg-gradient-to-br from-meme-pink to-meme-purple' : 'bg-white/10'}`}>
                    {isMainToken ? '💧' : '🪙'}
                  </div>
                )}
                
                <div>
                  <div className="font-bold text-lg">{coin.symbol}</div>
                  <div className="text-xs text-gray-400">
                    {isMainToken ? `$${suiPrice.toFixed(3)} per token` : coin.name}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-lg">
                  {formatAmount(coin.balance, coin.decimals)}
                </div>
                {isMainToken && totalValue > 0 && (
                  <div className="text-sm text-meme-purple font-semibold">
                    {formatUSD(totalValue)}
                  </div>
                )}
                {isMainToken && (
                  <Link
                    href="/tokens"
                    className="text-xs text-sui-blue hover:underline"
                  >
                    Trade →
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
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
