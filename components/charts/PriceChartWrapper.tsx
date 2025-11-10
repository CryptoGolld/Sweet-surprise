'use client';

import dynamic from 'next/dynamic';

// Import PriceChart with SSR disabled to prevent hydration errors
const PriceChart = dynamic(
  () => import('./PriceChart').then(mod => ({ default: mod.PriceChart })),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-2xl p-8">
        <div className="animate-pulse text-center text-gray-400">Loading chart...</div>
      </div>
    )
  }
);

interface PriceChartWrapperProps {
  coinType: string;
}

export function PriceChartWrapper({ coinType }: PriceChartWrapperProps) {
  return <PriceChart coinType={coinType} />;
}
