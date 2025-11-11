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
        // Use our own API route to avoid CORS and rate limiting issues
        const response = await fetch('/api/sui-price', {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch SUI price');
        }

        const data = await response.json();
        return data.price;
      } catch (error) {
        console.error('Failed to fetch SUI price:', error);
        // Return fallback price
        return 2.1;
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
