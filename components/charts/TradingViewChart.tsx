'use client';

import { useEffect, useRef } from 'react';
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
  
  // Fetch candle data
  const { data, isLoading, error } = useQuery({
    queryKey: ['chart', coinType],
    queryFn: async () => {
      const response = await fetch(
        `/api/proxy/chart/${encodeURIComponent(coinType)}?interval=1m&limit=1000`
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
    if (!chartContainerRef.current) return;

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
  }, []);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !data?.candles) return;

    const candles = data.candles.map((candle: any) => ({
      time: Math.floor(candle.time / 1000), // Convert to seconds
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
    })).reverse(); // TradingView wants oldest first

    if (candles.length > 0) {
      candleSeriesRef.current.setData(candles);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  if (error) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <div className="text-white/60">Chart unavailable</div>
        <div className="text-sm text-white/40 mt-2">Please try again later</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-8 text-center">
        <div className="animate-pulse text-gray-400">Loading chart...</div>
      </div>
    );
  }

  if (!data?.candles || data.candles.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <div className="text-xl font-semibold mb-2">No Trading History Yet</div>
        <div className="text-white/60 mb-2">This token hasn't had any trades yet</div>
        <div className="text-sm text-white/40">Be the first to trade and the chart will appear!</div>
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
            <div className="text-white/60 text-xs mb-1">24h High</div>
            <div className="font-mono font-semibold text-green-400">
              {Math.max(...data.candles.map((c: any) => c.high)).toFixed(10)}
            </div>
          </div>
          <div>
            <div className="text-white/60 text-xs mb-1">24h Low</div>
            <div className="font-mono font-semibold text-red-400">
              {Math.min(...data.candles.map((c: any) => c.low)).toFixed(10)}
            </div>
          </div>
          <div>
            <div className="text-white/60 text-xs mb-1">24h Change</div>
            <div className={`font-mono font-semibold ${
              data.candles[0].close >= data.candles[data.candles.length - 1].open
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {(((data.candles[0].close - data.candles[data.candles.length - 1].open) / 
                data.candles[data.candles.length - 1].open) * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-white/60 text-xs mb-1">Data Points</div>
            <div className="font-mono font-semibold">
              {data.candles.length} candles
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
