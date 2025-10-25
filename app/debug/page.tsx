'use client';

import { useBondingCurves } from '@/lib/hooks/useBondingCurves';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';

export default function DebugPage() {
  const { data: curves, isLoading, error } = useBondingCurves();
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [userCoins, setUserCoins] = useState<any[]>([]);
  
  useEffect(() => {
    if (account) {
      client.getAllCoins({ owner: account.address }).then(result => {
        setUserCoins(result.data);
      });
    }
  }, [account, client]);

  return (
    <div className="min-h-screen bg-sui-dark text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🔍 Debug Info</h1>
      
      {/* Bonding Curves */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Bonding Curves</h2>
        <div className="space-y-2 text-sm font-mono">
          <div>Loading: <span className={isLoading ? 'text-yellow-400' : 'text-green-400'}>{isLoading ? 'YES' : 'NO'}</span></div>
          <div>Error: <span className={error ? 'text-red-400' : 'text-green-400'}>{error ? error.message : 'NONE'}</span></div>
          <div>Count: <span className="text-blue-400">{curves?.length || 0}</span></div>
          {curves && curves.length > 0 && (
            <div className="mt-4">
              <div className="text-gray-400 mb-2">Sample curves:</div>
              {curves.slice(0, 3).map((curve, i) => (
                <div key={i} className="bg-white/5 p-2 rounded mb-2">
                  <div>#{i+1}: {curve.ticker} ({curve.name})</div>
                  <div className="text-xs text-gray-400">ID: {curve.id.slice(0, 20)}...</div>
                  <div className="text-xs text-gray-400">Supply: {curve.curveSupply}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* User Wallet */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">User Wallet</h2>
        <div className="space-y-2 text-sm font-mono">
          <div>Connected: <span className={account ? 'text-green-400' : 'text-red-400'}>{account ? 'YES' : 'NO'}</span></div>
          {account && (
            <>
              <div>Address: <span className="text-blue-400">{account.address.slice(0, 20)}...</span></div>
              <div>Coins: <span className="text-blue-400">{userCoins.length}</span></div>
              {userCoins.length > 0 && (
                <div className="mt-4">
                  <div className="text-gray-400 mb-2">Your coins:</div>
                  {userCoins.slice(0, 5).map((coin, i) => (
                    <div key={i} className="bg-white/5 p-2 rounded mb-2 text-xs">
                      <div>Type: {coin.coinType.split('::').pop()}</div>
                      <div>Balance: {coin.balance}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Match Status */}
      {account && curves && userCoins.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Match Status</h2>
          <div className="text-sm">
            {userCoins.map((coin, i) => {
              const curve = curves.find(c => c.coinType === coin.coinType);
              return (
                <div key={i} className="mb-2 p-2 bg-white/5 rounded">
                  <div className="font-mono text-xs">{coin.coinType.split('::').pop()}</div>
                  <div className={curve ? 'text-green-400' : 'text-red-400'}>
                    {curve ? '✅ Has curve data' : '❌ No curve found'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
