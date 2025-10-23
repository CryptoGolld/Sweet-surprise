/**
 * Hook to fetch user's coin balances
 */

import { useQuery } from '@tanstack/react-query';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { COIN_TYPES } from '../constants';

export function useUserCoins(coinType?: string) {
  const client = useSuiClient();
  const account = useCurrentAccount();
  
  return useQuery({
    queryKey: ['user-coins', account?.address, coinType],
    queryFn: async () => {
      if (!account?.address) return [];
      
      const type = coinType || COIN_TYPES.SUILFG_MEMEFI;
      
      const coins = await client.getCoins({
        owner: account.address,
        coinType: type,
      });
      
      return coins.data;
    },
    enabled: !!account?.address,
  });
}

export function useCoinBalance(coinType?: string) {
  const { data: coins } = useUserCoins(coinType);
  
  if (!coins || coins.length === 0) {
    return {
      balance: '0',
      coins: [],
      totalBalance: 0n,
    };
  }
  
  const totalBalance = coins.reduce(
    (sum, coin) => sum + BigInt(coin.balance),
    0n
  );
  
  return {
    balance: totalBalance.toString(),
    coins,
    totalBalance,
  };
}
