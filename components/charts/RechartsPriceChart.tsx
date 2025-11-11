'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';

interface PriceChartProps {
  coinType: string;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

const intervalLimits: Record<(typeof intervals)[number], number> = {
  '1m': 500,
  '5m': 288,
  '15m': 192,
  '1h': 168,
  '4h': 180,
  '1d': 90,
};

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg">
        <div className="font-semibold text-sm">{data.label}</div>
        <div>Open: {data.open}</div>
        <div>High: {data.high}</div>
        <div>Low: {data.low}</div>
        <div>Close: {data.close}</div>
      </div>
    );
  }
  return null;
};

export function RechartsPriceChart({ coinType }: PriceChartProps) {
  const [interval, setInterval] = useState<(typeof intervals)[number]>('1m');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['chart-recharts', coinType, interval],
    queryFn: async () => {
      const limit = intervalLimits[interval] ?? 500;
      const response = await fetch(
        `/api/proxy/chart/${encodeURIComponent(
          coinType,
        )}?interval=${interval}&limit=${limit}`,
      );
      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }
      return response.json();
    },
    staleTime: 5000,
    refetchInterval: 5000,
  });

  const processed = useMemo(() => {
    if (!data?.candles || data.candles.length === 0) return null;
    const candles: Candle[] = data.candles.map((c: any) => ({
      time: Number(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }));

    return candles.map((candle) => ({
      ...candle,
      label: formatTimestamp(candle.time),
    }));
  }, [data]);

  if (isError) {
    return (
      <div className="rounded-2xl bg-white/5 p-6 text-center text-sm text-red-400">
        Chart unavailable
      </div>
    );
  }

  if (isLoading || !processed) {
    return (
      <div className="rounded-2xl bg-white/5 p-6 text-center text-sm text-gray-400">
        Loading chart...
      </div>
    );
  }

  const last = processed[processed.length - 1];
  const first = processed[0];

  const changePercent =
    first && last ? ((last.close - first.open) / first.open) * 100 : 0;

  return (
    <div className="space-y-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 p-4 md:p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="text-2xl font-bold md:text-3xl">
            {last.close.toFixed(8)}{' '}
            {process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'SUI' : 'SUILFG'}
          </div>
          <div
            className={`text-sm font-semibold ${
              changePercent >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {changePercent >= 0 ? '↗' : '↘'} {Math.abs(changePercent).toFixed(2)}%
          </div>
        </div>

        <div className="flex w-full gap-1 overflow-x-auto sm:w-auto">
          {intervals.map((intvl) => (
            <button
              key={intvl}
              onClick={() => setInterval(intvl)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                interval === intvl
                  ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {intvl}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <AreaChart data={processed}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(236, 72, 153, 0.8)" />
              <stop offset="100%" stopColor="rgba(236, 72, 153, 0.1)" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
            minTickGap={24}
          />
          <YAxis
          domain={['dataMin', 'dataMax']}
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
          tickFormatter={(value) => value.toFixed(10)}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke="#ec4899"
            strokeWidth={2}
            fill="url(#priceGradient)"
            name="Close"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
