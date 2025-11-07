'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useQuery } from '@tanstack/react-query';

interface TradingViewChartProps {
  coinType: string;
}

export function TradingViewChart({ coinType }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Only render chart on client side to avoid hydration errors
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Fetch candle data
  const { data, isLoading, error } = useQuery({
    queryKey: ['chart', coinType, '1m'],
    queryFn: async () => {
      const response = await fetch(
        `/api/proxy/chart/${encodeURIComponent(coinType)}?interval=1m&limit=500`
      );
      if (!response.ok) throw new Error('Failed to fetch chart data');
      return response.json();
    },
    refetchInterval: 5000, // Update every 5 seconds
    staleTime: 2000,
    retry: false,
  });

  // Initialize chart
  useEffect(() => {
    if (!isClient || !chartContainerRef.current) return;

    const chart: any = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      crosshair: {
        vertLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          labelBackgroundColor: '#ec4899',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          labelBackgroundColor: '#ec4899',
        },
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [isClient]);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !data?.candles) return;

    // Filter out invalid candles and convert to TradingView format
    const candles = data.candles
      .map((candle: any) => ({
        time: Math.floor(candle.time / 1000), // Convert to seconds
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
      }))
      .filter((candle: any) => {
        // Filter out invalid data
        return !isNaN(candle.time) && 
               !isNaN(candle.open) && 
               candle.open > 0 &&
               candle.time > 0;
      })
      .reverse(); // TradingView wants oldest first

    if (candles.length > 0) {
      try {
        candleSeriesRef.current.setData(candles);
        chartRef.current?.timeScale().fitContent();
      } catch (err: any) {
        console.error('Error setting chart data:', err);
      }
    }
  }, [data]);

  if (error) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <div className="text-white/60">Chart unavailable</div>
      </div>
    );
  }

  if (!isClient || isLoading) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-8 text-center">
        <div className="animate-pulse text-gray-400">Loading chart...</div>
      </div>
    );
  }

  const hasTradeData = data?.candles && data.candles.length > 0;
  
  if (!hasTradeData) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <div className="text-xl font-semibold mb-2">No Trading History Yet</div>
        <div className="text-white/60">Be the first to trade!</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">📈 Price Chart</h3>
        <div className="text-sm text-gray-400">
          Powered by TradingView
        </div>
      </div>

      {/* Chart */}
      <div 
        ref={chartContainerRef} 
        className="w-full"
        style={{ minHeight: '400px' }}
      />

      {/* Stats */}
      {data?.candles && data.candles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-white/10 pt-4">
          <div>
            <div className="text-white/60 text-xs mb-1">High</div>
            <div className="font-mono font-semibold text-green-400">
              {Math.max(...data.candles.map((c: any) => c.high)).toFixed(10)}
            </div>
          </div>
          <div>
            <div className="text-white/60 text-xs mb-1">Low</div>
            <div className="font-mono font-semibold text-red-400">
              {Math.min(...data.candles.map((c: any) => c.low)).toFixed(10)}
            </div>
          </div>
          <div>
            <div className="text-white/60 text-xs mb-1">Change</div>
            <div className={`font-mono font-semibold ${
              data.candles[data.candles.length - 1]?.close >= data.candles[0]?.open
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {data.candles.length >= 2 ? 
                (((data.candles[data.candles.length - 1].close - data.candles[0].open) / 
                  data.candles[0].open) * 100).toFixed(2) + '%'
                : '0.00%'}
            </div>
          </div>
          <div>
            <div className="text-white/60 text-xs mb-1">Trades</div>
            <div className="font-mono font-semibold">
              {data.totalTrades || data.candles.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
