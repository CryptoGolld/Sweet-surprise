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
      // Call through Next.js proxy to avoid mixed content issues
      const response = await fetch(
        `/api/proxy/chart/${encodeURIComponent(coinType)}?interval=${interval}&limit=100`
      );
      if (!response.ok) throw new Error('Failed to fetch chart data');
      return response.json();
    },
    refetchInterval: 5000, // Update every 5 seconds
    staleTime: 3000,
    retry: false, // Don't retry if indexer is not running
  });

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400">Chart unavailable</p>
      </div>
    );
  }

  if (isLoading || !data?.candles) {
    return (
      <div className="bg-white/5 rounded-lg p-8 flex items-center justify-center">
        <div className="animate-pulse">Loading chart...</div>
      </div>
    );
  }

  const candles: Candle[] = data.candles;

  // Calculate price change
  const firstCandle = candles[candles.length - 1];
  const lastCandle = candles[0];
  const priceChange = lastCandle && firstCandle 
    ? ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100 
    : 0;

  // Find min/max for scaling
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Scale to chart height (200px)
  const chartHeight = 200;
  const scaleY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  return (
    <div className="bg-white/5 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">
            {lastCandle?.close.toFixed(8)} SUI
          </div>
          <div className={`text-sm ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {priceChange >= 0 ? '↗' : '↘'} {Math.abs(priceChange).toFixed(2)}%
          </div>
        </div>

        {/* Interval selector */}
        <div className="flex gap-1">
          {['1m', '5m', '15m', '1h', '4h', '1d'].map(int => (
            <button
              key={int}
              onClick={() => setInterval(int)}
              className={`px-3 py-1 rounded text-xs ${
                interval === int
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {int}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight }}>
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
                {/* Wick */}
                <line
                  x1={`${x + width / 2}%`}
                  y1={yHigh}
                  x2={`${x + width / 2}%`}
                  y2={yLow}
                  stroke={color}
                  strokeWidth="1"
                />
                {/* Body */}
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 text-xs">
        <div>
          <div className="text-white/60">High</div>
          <div className="font-mono">{maxPrice.toFixed(8)}</div>
        </div>
        <div>
          <div className="text-white/60">Low</div>
          <div className="font-mono">{minPrice.toFixed(8)}</div>
        </div>
        <div>
          <div className="text-white/60">Open</div>
          <div className="font-mono">{firstCandle?.open.toFixed(8)}</div>
        </div>
        <div>
          <div className="text-white/60">Close</div>
          <div className="font-mono">{lastCandle?.close.toFixed(8)}</div>
        </div>
      </div>
    </div>
  );
}
