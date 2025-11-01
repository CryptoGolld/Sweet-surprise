'use client';

import { ReactNode } from 'react';
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
} from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import '@mysten/dapp-kit/dist/index.css';

// Configure network based on environment variable
const networkType = (process.env.NEXT_PUBLIC_NETWORK || 'testnet') as 'testnet' | 'mainnet';

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

// Query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

export function SuiProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={networkType}>
        <WalletProvider autoConnect>
          {children}
          <Toaster position="bottom-right" richColors />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
