'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: string;
}

interface PriceChartProps {
  coinType: string;
}

export function PriceChart({ coinType }: PriceChartProps) {
  const [interval, setInterval] = useState('1m');

  const { data, isLoading, error } = useQuery({
    queryKey: ['chart', coinType, interval],
    queryFn: async () => {
      const response = await fetch(
        `/api/proxy/chart/${encodeURIComponent(coinType)}?interval=${interval}&limit=100`
      );
      if (!response.ok) throw new Error('Failed to fetch chart data');
      return response.json();
    },
    refetchInterval: 3000, // Update charts every 3 seconds
    staleTime: 1000, // Fresh data for memecoin volatility
    retry: false,
  });

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-2xl p-6">
        <p className="text-red-400 text-center">📊 Chart unavailable</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-8">
        <div className="animate-pulse text-center text-gray-400">Loading chart...</div>
      </div>
    );
  }

  const candles: Candle[] = data?.candles || [];
  
  if (candles.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <div className="text-xl font-semibold mb-2">No Trading History Yet</div>
        <div className="text-white/60 mb-2">This token hasn't had any trades yet</div>
        <div className="text-sm text-white/40">Be the first to trade and the chart will appear!</div>
      </div>
    );
  }

  const firstCandle = candles[candles.length - 1];
  const lastCandle = candles[0];
  const priceChange = lastCandle && firstCandle 
    ? ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100 
    : 0;

  const prices = candles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  const chartHeight = 240;
  const scaleY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-2xl md:text-3xl font-bold">
            {lastCandle?.close.toFixed(8)} SUILFG
          </div>
          <div className={`text-sm font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {priceChange >= 0 ? '↗' : '↘'} {Math.abs(priceChange).toFixed(2)}%
          </div>
        </div>

        {/* Interval selector - Mobile friendly */}
        <div className="flex gap-1 overflow-x-auto w-full sm:w-auto">
          {['1m', '5m', '15m', '1h', '4h', '1d'].map(int => (
            <button
              key={int}
              onClick={() => setInterval(int)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                interval === int
                  ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {int}
            </button>
          ))}
        </div>
      </div>

      {/* Chart - Responsive */}
      <div className="w-full overflow-hidden">
        <div className="relative w-full" style={{ height: chartHeight }}>
          <svg width="100%" height={chartHeight} className="overflow-visible">
            {candles.map((candle, i) => {
              const x = (i / candles.length) * 100;
              const width = (1 / candles.length) * 100;
              
              const yHigh = scaleY(candle.high);
              const yLow = scaleY(candle.low);
              const yOpen = scaleY(candle.open);
              const yClose = scaleY(candle.close);
              
              const isGreen = candle.close >= candle.open;
              const color = isGreen ? '#10b981' : '#ef4444';
              
              return (
                <g key={i}>
                  <line
                    x1={`${x + width / 2}%`}
                    y1={yHigh}
                    x2={`${x + width / 2}%`}
                    y2={yLow}
                    stroke={color}
                    strokeWidth="1"
                  />
                  <rect
                    x={`${x + width * 0.2}%`}
                    y={Math.min(yOpen, yClose)}
                    width={`${width * 0.6}%`}
                    height={Math.max(Math.abs(yClose - yOpen), 1)}
                    fill={color}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Stats - Mobile grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-white/60 text-xs mb-1">High</div>
          <div className="font-mono font-semibold">{maxPrice.toFixed(8)}</div>
        </div>
        <div>
          <div className="text-white/60 text-xs mb-1">Low</div>
          <div className="font-mono font-semibold">{minPrice.toFixed(8)}</div>
        </div>
        <div>
          <div className="text-white/60 text-xs mb-1">Open</div>
          <div className="font-mono font-semibold">{firstCandle?.open.toFixed(8)}</div>
        </div>
        <div>
          <div className="text-white/60 text-xs mb-1">Close</div>
          <div className="font-mono font-semibold">{lastCandle?.close.toFixed(8)}</div>
        </div>
      </div>
    </div>
  );
}
