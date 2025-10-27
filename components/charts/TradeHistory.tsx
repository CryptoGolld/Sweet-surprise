'use client';

import { useQuery } from '@tanstack/react-query';

interface Trade {
  timestamp: string;
  type: 'buy' | 'sell';
  trader: string;
  token_amount: string;
  sui_amount: string;
  price_per_token: string;
}

interface TradeHistoryProps {
  coinType: string;
}

export function TradeHistory({ coinType }: TradeHistoryProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['trades', coinType],
    queryFn: async () => {
      const response = await fetch(
        `/api/proxy/trades/${encodeURIComponent(coinType)}?limit=50`
      );
      if (!response.ok) throw new Error('Failed to fetch trades');
      return response.json();
    },
    refetchInterval: 5000,
    staleTime: 3000,
    retry: false,
  });

  if (error) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-lg mb-4">📜 Recent Trades</h3>
        <p className="text-gray-400 text-center py-8">Failed to load trades</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-lg mb-4">📜 Recent Trades</h3>
        <div className="animate-pulse text-center py-8 text-gray-400">Loading...</div>
      </div>
    );
  }

  const trades: Trade[] = data?.trades || [];

  if (trades.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-lg mb-4">📜 Recent Trades</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-400">No trades yet</p>
        </div>
      </div>
    );
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }

  function formatAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-4 md:p-6">
      <h3 className="font-bold text-lg mb-4">📜 Recent Trades</h3>
      
      {/* Mobile-optimized trade list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {trades.map((trade, i) => (
          <div
            key={i}
            className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                  trade.type === 'buy'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {trade.type === 'buy' ? '🟢 Buy' : '🔴 Sell'}
                </span>
                <span className="text-xs text-gray-400">{formatTime(trade.timestamp)}</span>
              </div>
              <a
                href={`https://testnet.suivision.xyz/account/${trade.trader}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-meme-purple hover:text-meme-pink font-mono"
              >
                {formatAddress(trade.trader)}
              </a>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Amount: </span>
                <span className="font-semibold">{(parseFloat(trade.token_amount) / 1e9).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-400">Price: </span>
                <span className="font-mono font-semibold">{parseFloat(trade.price_per_token).toFixed(8)}</span>
              </div>
            </div>
            
            <div className="mt-2 text-sm">
              <span className="text-gray-400">Total: </span>
              <span className="font-semibold">{(parseFloat(trade.sui_amount) / 1e9).toFixed(4)} SUILFG</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
