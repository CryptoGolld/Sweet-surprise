'use client';

import { useQuery } from '@tanstack/react-query';

interface Trade {
  txDigest: string;
  trader: string;
  type: 'buy' | 'sell';
  suiAmount: string;
  tokenAmount: string;
  price: number;
  timestamp: number;
}

interface TradeHistoryProps {
  coinType: string;
}

export function TradeHistory({ coinType }: TradeHistoryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['trades', coinType],
    queryFn: async () => {
      // Call through Next.js proxy to avoid mixed content issues
      const response = await fetch(
        `/api/proxy/trades/${encodeURIComponent(coinType)}?limit=50`
      );
      if (!response.ok) throw new Error('Failed to fetch trades');
      return response.json();
    },
    refetchInterval: 3000,
    staleTime: 2000,
    retry: false, // Don't retry if indexer is not running
  });

  if (isLoading) {
    return (
      <div className="bg-white/5 rounded-lg p-4">
        <div className="animate-pulse">Loading trades...</div>
      </div>
    );
  }

  const trades: Trade[] = data?.trades || [];

  return (
    <div className="bg-white/5 rounded-lg p-4">
      <h3 className="font-bold mb-4">Recent Trades</h3>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {trades.map((trade) => (
          <div
            key={trade.txDigest}
            className="flex items-center justify-between p-3 bg-white/5 rounded hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`px-2 py-1 rounded text-xs font-bold ${
                  trade.type === 'buy'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {trade.type.toUpperCase()}
              </div>
              
              <div>
                <div className="text-sm font-mono">
                  {(parseFloat(trade.tokenAmount) / 1e9).toLocaleString()} tokens
                </div>
                <div className="text-xs text-white/60">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-mono">
                {(parseFloat(trade.suiAmount) / 1e9).toFixed(4)} SUI
              </div>
              <div className="text-xs text-white/60">
                @ {trade.price.toFixed(8)}
              </div>
            </div>
          </div>
        ))}
        
        {trades.length === 0 && (
          <div className="text-center text-white/60 py-8">
            No trades yet
          </div>
        )}
      </div>
    </div>
  );
}
