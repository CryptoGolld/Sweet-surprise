'use client';

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { formatAmount } from '@/lib/sui/client';
import { COIN_TYPES } from '@/lib/constants';
import Link from 'next/link';

// Mock SUI price for testnet (for display only - not real trading)
const MOCK_SUI_PRICE = 3.50; // USD

export function UserPortfolio() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['user-portfolio', account?.address],
    queryFn: async () => {
      if (!account?.address) return null;

      // Get all coins owned by user
      const allCoins = await client.getAllCoins({
        owner: account.address,
      });

      // Group by coin type
      const coinMap = new Map<string, { balance: bigint; count: number; type: string }>();

      for (const coin of allCoins.data) {
        const existing = coinMap.get(coin.coinType) || { balance: 0n, count: 0, type: coin.coinType };
        existing.balance += BigInt(coin.balance);
        existing.count += 1;
        coinMap.set(coin.coinType, existing);
      }

      const coins = Array.from(coinMap.entries()).map(([type, data]) => ({
        type,
        balance: data.balance.toString(),
        count: data.count,
      }));
      
      // Calculate total value in SUILFG_MEMEFI
      const memefiToken = coins.find(c => c.type === COIN_TYPES.SUILFG_MEMEFI);
      const memefiBalance = memefiToken ? Number(memefiToken.balance) / 1e9 : 0;
      
      return {
        coins,
        totalMemefi: memefiBalance,
        estimatedSuiValue: memefiBalance, // 1:1 ratio for now
        estimatedUsdValue: memefiBalance * MOCK_SUI_PRICE,
      };
    },
    enabled: !!account?.address,
    refetchInterval: 10000,
  });

  if (!account) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <p className="text-gray-400">Connect your wallet to view your portfolio</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
              <div className="h-8 bg-white/10 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!portfolio || !portfolio.coins || portfolio.coins.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🪙</div>
        <h3 className="text-2xl font-bold mb-2">No Tokens Yet</h3>
        <p className="text-gray-400 mb-6">Start by claiming free SUILFG_MEMEFI tokens</p>
        <Link
          href="/faucet"
          className="inline-block px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform"
        >
          💧 Claim Tokens
        </Link>
      </div>
    );
  }

  // Separate SUILFG_MEMEFI from other tokens
  const memefiToken = portfolio.coins.find(c => c.type === COIN_TYPES.SUILFG_MEMEFI);
  const otherTokens = portfolio.coins.filter(c => c.type !== COIN_TYPES.SUILFG_MEMEFI);

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total SUILFG_MEMEFI Balance */}
        <div className="bg-gradient-to-br from-meme-pink/20 to-meme-purple/20 border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">SUILFG_MEMEFI Balance</span>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-gradient mb-1">
            {formatAmount(portfolio.totalMemefi.toString(), 2)}
          </div>
          <div className="text-xs text-gray-400">
            Platform trading token
          </div>
        </div>

        {/* Estimated SUI Value */}
        <div className="bg-gradient-to-br from-sui-blue/20 to-green-500/20 border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Est. SUI Value</span>
            <span className="text-2xl">💎</span>
          </div>
          <div className="text-3xl font-bold text-gradient mb-1">
            {portfolio.estimatedSuiValue.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">
            ~${portfolio.estimatedUsdValue.toFixed(2)} USD
          </div>
        </div>

        {/* Total Assets */}
        <div className="bg-gradient-to-br from-green-500/20 to-yellow-500/20 border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Assets</span>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-3xl font-bold text-gradient mb-1">
            {portfolio.coins.length}
          </div>
          <div className="text-xs text-gray-400">
            {otherTokens.length} memecoins
          </div>
        </div>
      </div>

      {/* Platform Token Section */}
      {memefiToken && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>💧</span>
            <span>Platform Token</span>
          </h3>
          <div className="bg-gradient-to-r from-meme-pink/10 to-meme-purple/10 border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-2xl font-bold mb-1">SUILFG_MEMEFI</div>
                <div className="text-sm text-gray-400">Used for trading all memecoins</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gradient">
                  {formatAmount(memefiToken.balance, 2)}
                </div>
                <div className="text-xs text-gray-400">{memefiToken.count} object(s)</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/faucet"
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-center hover:bg-white/10 transition-colors"
              >
                💧 Claim More
              </Link>
              <Link
                href="/tokens"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg text-center hover:scale-105 transition-transform"
              >
                🔥 Trade Memecoins
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Memecoin Holdings */}
      {otherTokens.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>🚀</span>
            <span>Memecoin Holdings</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherTokens.map((coin) => {
              // Extract coin symbol from type
              const parts = coin.type.split('::');
              const symbol = parts[parts.length - 1] || 'UNKNOWN';
              const balanceNum = Number(coin.balance) / 1e9;

              return (
                <div
                  key={coin.type}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-bold text-lg mb-1">{symbol}</div>
                      <div className="text-xs text-gray-400 break-all">
                        {parts[0]}::...
                      </div>
                    </div>
                    <div className="text-2xl ml-2">🪙</div>
                  </div>
                  
                  <div className="text-2xl font-bold text-gradient mb-1">
                    {formatAmount(coin.balance, 2)}
                  </div>
                  
                  <div className="text-xs text-gray-400">
                    {coin.count} coin object(s)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-meme-pink/10 to-meme-purple/10 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/tokens"
            className="p-4 bg-white/5 border border-white/10 rounded-lg text-center hover:bg-white/10 transition-colors"
          >
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-sm font-semibold">Browse Tokens</div>
          </Link>
          <Link
            href="/faucet"
            className="p-4 bg-white/5 border border-white/10 rounded-lg text-center hover:bg-white/10 transition-colors"
          >
            <div className="text-3xl mb-2">💧</div>
            <div className="text-sm font-semibold">Claim Faucet</div>
          </Link>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="p-4 bg-white/5 border border-white/10 rounded-lg text-center hover:bg-white/10 transition-colors"
          >
            <div className="text-3xl mb-2">🚀</div>
            <div className="text-sm font-semibold">Create Coin</div>
          </button>
          <a
            href={`https://suiscan.xyz/testnet/account/${account.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-white/5 border border-white/10 rounded-lg text-center hover:bg-white/10 transition-colors"
          >
            <div className="text-3xl mb-2">🔍</div>
            <div className="text-sm font-semibold">View on Explorer</div>
          </a>
        </div>
      </div>

      {/* Pricing Note */}
      <div className="bg-sui-blue/10 border border-sui-blue/30 rounded-lg p-4 text-sm text-gray-400">
        <strong className="text-sui-blue">ℹ️ Pricing Note:</strong> Values are estimated based on SUILFG_MEMEFI balance. 
        SUI price is mocked at ${MOCK_SUI_PRICE} for testnet display. Not financial advice.
      </div>
    </div>
  );
}
