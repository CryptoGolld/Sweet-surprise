'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from './wallet/ConnectButton';
import { CreateCoinModal } from './modals/CreateCoinModal';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { NETWORK } from '@/lib/constants';
import { useSuiPrice } from '@/lib/hooks/useSuiPrice';
import { getPaymentTokenSymbol } from '@/lib/utils/networkText';

export function Header() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const account = useCurrentAccount();
  const pathname = usePathname();
  const { data: suiPrice } = useSuiPrice();
  
  const isActive = (path: string) => pathname === path;
  const isHomePage = pathname === '/';
  
  return (
    <>
      <header className="border-b border-white/10 bg-sui-dark/50 backdrop-blur-lg sticky top-0 z-50">
        <div className={`container mx-auto px-4 transition-all ${isHomePage ? 'py-4' : 'py-2'}`}>
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className={`bg-gradient-to-br from-meme-pink via-meme-purple to-sui-blue rounded-xl flex items-center justify-center font-bold transition-all ${isHomePage ? 'w-12 h-12 text-2xl' : 'w-8 h-8 text-lg'}`}>
                🚀
              </div>
              <div>
                <h1 className={`font-bold text-gradient transition-all ${isHomePage ? 'text-2xl' : 'text-lg'}`}>
                  SuiLFG MemeFi
                </h1>
                {isHomePage && <p className="text-xs text-gray-400">Testnet Campaign</p>}
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
              {NETWORK === 'testnet' && (
                <Link 
                  href="/faucet" 
                  className={`transition-colors ${isActive('/faucet') ? 'text-gradient font-semibold' : 'text-gray-300 hover:text-white'}`}
                >
                  💧 Faucet
                </Link>
              )}
              <Link 
                href="/portfolio" 
                className={`transition-colors ${isActive('/portfolio') ? 'text-gradient font-semibold' : 'text-gray-300 hover:text-white'}`}
              >
                💼 Portfolio
              </Link>
              <Link 
                href="/referrals" 
                className={`transition-colors ${isActive('/referrals') ? 'text-gradient font-semibold' : 'text-gray-300 hover:text-white'}`}
              >
                🎁 Referrals
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* SUI Price */}
              {suiPrice && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-gray-400 text-sm">SUI</span>
                  <span className="text-green-400 font-bold text-sm">${suiPrice.toFixed(3)}</span>
                </div>
              )}
              
              {account && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="hidden md:block px-4 md:px-6 py-2 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold text-sm md:text-base hover:scale-105 transition-transform"
                >
                  + Create
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
