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
  const [interval, setInterval] = useState('1m');
  
  // Only render chart on client side to avoid hydration errors
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate appropriate limit based on interval
  const getLimitForInterval = (int: string) => {
    const limits: Record<string, number> = {
      '1m': 500,   // 8+ hours
      '5m': 288,   // 24 hours
      '15m': 192,  // 48 hours
      '1h': 168,   // 7 days
      '4h': 180,   // 30 days
      '1d': 90,    // 90 days
    };
    return limits[int] || 500;
  };
  
  // Fetch candle data
  const { data, isLoading, error } = useQuery({
    queryKey: ['chart', coinType, interval],
    queryFn: async () => {
      const limit = getLimitForInterval(interval);
      const response = await fetch(
        `/api/proxy/chart/${encodeURIComponent(coinType)}?interval=${interval}&limit=${limit}`
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

    const container = chartContainerRef.current;
    const initialWidth = container.clientWidth || 600;

    const chart: any = createChart(container, {
      width: initialWidth,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
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
      priceFormat: {
        type: 'price',
        precision: 10,
        minMove: 0.0000000001,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (!chartRef.current || !chartContainerRef.current) return;
      const { clientWidth } = chartContainerRef.current;
      if (clientWidth > 0) {
        chartRef.current.applyOptions({ width: clientWidth });
        chartRef.current.timeScale().fitContent();
      }
    };

    handleResize();

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
    }

    return () => {
      resizeObserver?.disconnect();
      chart.remove();
      candleSeriesRef.current = null;
      chartRef.current = null;
    };
  }, [isClient]);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current || !data?.candles || data.candles.length === 0) return;

    console.log('📊 Chart data received:', {
      candleCount: data.candles.length,
      firstCandle: data.candles[0],
      lastCandle: data.candles[data.candles.length - 1],
      interval: data.interval
    });

    // Convert to TradingView format (timestamps in SECONDS)
    const candles = data.candles
      .map((candle: any) => {
        const timeInSeconds = Math.floor(candle.time / 1000);
        return {
          time: timeInSeconds,
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
        };
      })
      .filter((candle: any) => {
        // Filter out invalid data
        const isValid = !isNaN(candle.time) && 
               !isNaN(candle.open) && 
               !isNaN(candle.high) &&
               !isNaN(candle.low) &&
               !isNaN(candle.close) &&
               candle.open > 0 &&
               candle.time > 0;
        
        if (!isValid) {
          console.warn('⚠️ Filtered out invalid candle:', candle);
        }
        return isValid;
      })
      .sort((a: any, b: any) => a.time - b.time); // Sort oldest to newest

      console.log('📊 Processed candles for chart:', {
        count: candles.length,
        first: candles[0],
        last: candles[candles.length - 1],
      });

      if (candles.length > 0) {
        try {
          candleSeriesRef.current.setData(candles);
          chartRef.current?.timeScale().fitContent();
          console.log('✅ Chart data set successfully');
        } catch (err: any) {
          console.error('❌ Error setting chart data:', err);
        }
      } else {
        console.warn('⚠️ No valid candles to display');
      }
  }, [data]);

  if (error) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <div className="text-white/60">Chart unavailable</div>
        <div className="text-sm text-red-400 mt-2">{error.message}</div>
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

  // Calculate stats
  const candles = data.candles;
  const firstCandle = candles[0];
  const lastCandle = candles[candles.length - 1];
  const priceChange = firstCandle && lastCandle
    ? ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
    : 0;
  const high = Math.max(...candles.map((c: any) => parseFloat(c.high)));
  const low = Math.min(...candles.map((c: any) => parseFloat(c.low)));

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-4 md:p-6 space-y-4">
      {/* Header with Interval Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold mb-1">📈 Price Chart</h3>
          <div className="text-sm text-gray-400">
            {lastCandle?.close.toFixed(10)} {process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'SUI' : 'SUILFG'}
            <span className={`ml-2 font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? '↗' : '↘'} {Math.abs(priceChange).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Interval Selector */}
        <div className="flex gap-1 overflow-x-auto w-full sm:w-auto">
          {['1m', '5m', '15m', '1h', '4h', '1d'].map(int => (
            <button
              key={int}
              onClick={() => setInterval(int)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                interval === int
                  ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white shadow-lg'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {int}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div 
        ref={chartContainerRef} 
        className="w-full"
        style={{ minHeight: '400px' }}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-white/10 pt-4">
        <div>
          <div className="text-white/60 text-xs mb-1">High</div>
          <div className="font-mono font-semibold text-green-400">
            {high.toFixed(10)}
          </div>
        </div>
        <div>
          <div className="text-white/60 text-xs mb-1">Low</div>
          <div className="font-mono font-semibold text-red-400">
            {low.toFixed(10)}
          </div>
        </div>
        <div>
          <div className="text-white/60 text-xs mb-1">Change</div>
          <div className={`font-mono font-semibold ${
            priceChange >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {priceChange.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-white/60 text-xs mb-1">Trades</div>
          <div className="font-mono font-semibold">
            {data.totalTrades || candles.length}
          </div>
        </div>
      </div>

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 border-t border-white/5 pt-2">
          Debug: {candles.length} candles | Interval: {interval} | First: {new Date(firstCandle?.time).toLocaleString()} | Last: {new Date(lastCandle?.time).toLocaleString()}
        </div>
      )}
    </div>
  );
}
