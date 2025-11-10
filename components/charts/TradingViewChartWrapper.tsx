'use client';

import dynamic from 'next/dynamic';

// Import TradingViewChart with SSR disabled to prevent hydration errors
const TradingViewChart = dynamic(
  () => import('./TradingViewChart').then(mod => ({ default: mod.TradingViewChart })),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-8 text-center">
        <div className="animate-pulse text-gray-400">Loading chart...</div>
      </div>
    )
  }
);

interface TradingViewChartWrapperProps {
  coinType: string;
}

export function TradingViewChartWrapper({ coinType }: TradingViewChartWrapperProps) {
  return <TradingViewChart coinType={coinType} />;
}
