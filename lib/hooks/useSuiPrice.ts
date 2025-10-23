/**
 * Hook to fetch real-time SUI price from CoinGecko
 */

import { useQuery } from '@tanstack/react-query';

interface SuiPriceData {
  sui: {
    usd: number;
  };
}

export function useSuiPrice() {
  return useQuery({
    queryKey: ['sui-price'],
    queryFn: async (): Promise<number> => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd',
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch SUI price');
        }

        const data: SuiPriceData = await response.json();
        return data.sui.usd;
      } catch (error) {
        console.error('Failed to fetch SUI price:', error);
        // Return fallback price
        return 1.0;
      }
    },
    refetchInterval: 60000, // Refresh every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

/**
 * Format USD price
 */
export function formatUSD(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(2)}K`;
  }
  if (amount >= 1) {
    return `$${amount.toFixed(2)}`;
  }
  return `$${amount.toFixed(4)}`;
}
