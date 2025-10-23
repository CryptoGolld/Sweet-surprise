'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from './wallet/ConnectButton';
import { CreateCoinModal } from './modals/CreateCoinModal';
import { useCurrentAccount } from '@mysten/dapp-kit';

export function Header() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const account = useCurrentAccount();
  const pathname = usePathname();
  
  const isActive = (path: string) => pathname === path;
  
  return (
    <>
      <header className="border-b border-white/10 bg-sui-dark/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 bg-gradient-to-br from-meme-pink via-meme-purple to-sui-blue rounded-xl flex items-center justify-center font-bold text-2xl">
                🚀
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">
                  SuiLFG MemeFi
                </h1>
                <p className="text-xs text-gray-400">Testnet Campaign</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/tokens" 
                className={`transition-colors ${isActive('/tokens') ? 'text-gradient font-semibold' : 'text-gray-300 hover:text-white'}`}
              >
                🔥 Tokens
              </Link>
              <Link 
                href="/faucet" 
                className={`transition-colors ${isActive('/faucet') ? 'text-gradient font-semibold' : 'text-gray-300 hover:text-white'}`}
              >
                💧 Faucet
              </Link>
              <Link 
                href="/portfolio" 
                className={`transition-colors ${isActive('/portfolio') ? 'text-gradient font-semibold' : 'text-gray-300 hover:text-white'}`}
              >
                💼 Portfolio
              </Link>
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
