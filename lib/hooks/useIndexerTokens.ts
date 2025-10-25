/**
 * Hook to fetch tokens from indexer (much faster than blockchain)
 * Falls back to blockchain if indexer is unavailable
 */

import { useQuery } from '@tanstack/react-query';
import { useBondingCurves, BondingCurve } from './useBondingCurves';

export function useIndexerTokens() {
  const blockchainFallback = useBondingCurves();
  
  const indexerQuery = useQuery({
    queryKey: ['indexer-tokens'],
    queryFn: async (): Promise<BondingCurve[]> => {
      try {
        const response = await fetch('/api/tokens?limit=100');
        
        if (!response.ok) {
          throw new Error('Indexer unavailable');
        }
        
        const data = await response.json();
        
        if (data.fallback) {
          throw new Error('Indexer not configured');
        }
        
        return data.tokens;
      } catch (error) {
        console.log('Indexer unavailable, using blockchain');
        throw error;
      }
    },
    retry: false, // Don't retry, just fall back to blockchain
    staleTime: 3000,
  });

  // Use indexer if available, otherwise use blockchain
  if (indexerQuery.isError || !indexerQuery.data) {
    return blockchainFallback;
  }

  return {
    data: indexerQuery.data,
    isLoading: indexerQuery.isLoading,
    error: indexerQuery.error,
  };
}
