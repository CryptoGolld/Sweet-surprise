'use client';

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { formatAmount, truncateAddress } from '@/lib/sui/client';
import { COIN_TYPES } from '@/lib/constants';

export function UserPortfolio() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  const { data: coins, isLoading } = useQuery({
    queryKey: ['user-portfolio', account?.address],
    queryFn: async () => {
      if (!account?.address) return [];

      // Get all coins owned by user
      const allCoins = await client.getAllCoins({
        owner: account.address,
      });

      // Group by coin type
      const coinMap = new Map<string, { balance: bigint; count: number; type: string }>();

      for (const coin of allCoins.data) {
        const existing = coinMap.get(coin.coinType) || { balance: 0n, count: 0, type: coin.coinType };
        existing.balance += BigInt(coin.balance);
        existing.count += 1;
        coinMap.set(coin.coinType, existing);
      }

      return Array.from(coinMap.entries()).map(([type, data]) => ({
        type,
        balance: data.balance.toString(),
        count: data.count,
      }));
    },
    enabled: !!account?.address,
  });

  if (!account) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <p className="text-gray-400">Connect your wallet to view your portfolio</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-white/10 rounded w-1/4" />
          <div className="h-4 bg-white/10 rounded w-1/3" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!coins || coins.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">🪙</div>
        <p className="text-gray-400 mb-4">No tokens yet</p>
        <p className="text-sm text-gray-500">Buy some memecoins to see them here!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {coins.map((coin) => {
        // Extract coin symbol from type
        const parts = coin.type.split('::');
        const symbol = parts[parts.length - 1] || 'UNKNOWN';
        const isPaymentToken = coin.type === COIN_TYPES.SUILFG_MEMEFI;

        return (
          <div
            key={coin.type}
            className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold truncate">{symbol}</h3>
                <p className="text-xs text-gray-400 truncate font-mono">
                  {truncateAddress(coin.type, 10, 8)}
                </p>
              </div>
              {isPaymentToken && (
                <span className="ml-2 px-2 py-1 bg-sui-blue/20 text-sui-blue text-xs rounded">
                  Payment
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Balance</span>
                <span className="font-bold text-gradient">
                  {formatAmount(coin.balance, 9)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Objects</span>
                <span className="text-sm">{coin.count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
