'use client';

import { ConnectButton as DAppKitConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { truncateAddress } from '@/lib/sui/client';

export function ConnectButton() {
  const account = useCurrentAccount();
  
  if (account) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-mono">
            {truncateAddress(account.address)}
          </span>
        </div>
        <DAppKitConnectButton />
      </div>
    );
  }
  
  return (
    <button className="px-6 py-2 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform">
      <DAppKitConnectButton />
    </button>
  );
}
