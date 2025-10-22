'use client';

import { useState } from 'react';
import { ConnectButton } from './wallet/ConnectButton';
import { CreateCoinModal } from './modals/CreateCoinModal';
import { useCurrentAccount } from '@mysten/dapp-kit';

export function Header() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const account = useCurrentAccount();
  
  return (
    <>
      <header className="border-b border-white/10 bg-sui-dark/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 bg-gradient-to-br from-meme-pink via-meme-purple to-sui-blue rounded-xl flex items-center justify-center font-bold text-2xl">
                🚀
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">
                  SuiLFG MemeFi
                </h1>
                <p className="text-xs text-gray-400">Testnet Campaign</p>
              </div>
            </a>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#coins" className="text-gray-300 hover:text-white transition-colors">
                Coins
              </a>
              <a href="#portfolio" className="text-gray-300 hover:text-white transition-colors">
                Portfolio
              </a>
              <a
                href="https://suiscan.xyz/testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Explorer ↗
              </a>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {account && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="hidden sm:block px-6 py-2 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform"
                >
                  + Create Coin
                </button>
              )}
              
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>
      
      <CreateCoinModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}
