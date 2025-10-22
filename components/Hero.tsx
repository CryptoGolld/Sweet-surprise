'use client';

import { useState } from 'react';
import { CreateCoinModal } from './modals/CreateCoinModal';
import { useCurrentAccount } from '@mysten/dapp-kit';

export function Hero() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const account = useCurrentAccount();

  return (
    <>
      <section className="text-center py-16 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-meme-pink/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-sui-blue/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-meme-purple/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Launch Your{' '}
            <span className="text-gradient">Memecoin</span>
            <br />
            in Seconds
          </h1>
          
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Fair launch with bonding curves. No presales. No BS. 
            Just pure memecoin magic on Sui.
          </p>

          <div className="flex items-center justify-center gap-4 pt-8 flex-wrap">
            {account ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-meme-pink via-meme-purple to-sui-blue rounded-lg font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-meme-pink/50"
              >
                🚀 Create Coin Now
              </button>
            ) : (
              <div className="px-8 py-4 bg-white/10 border border-white/20 rounded-lg text-gray-400">
                Connect wallet to create coins
              </div>
            )}
            
            <a
              href="#coins"
              className="px-8 py-4 border-2 border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-colors"
            >
              Explore Coins
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl mb-2">⚡</div>
              <div className="text-2xl font-bold text-gradient">Instant</div>
              <div className="text-sm text-gray-400">Launch in 30 seconds</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">📈</div>
              <div className="text-2xl font-bold text-gradient">Fair</div>
              <div className="text-sm text-gray-400">Bonding curve pricing</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🎓</div>
              <div className="text-2xl font-bold text-gradient">Graduate</div>
              <div className="text-sm text-gray-400">Auto at 737M tokens</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🏊</div>
              <div className="text-2xl font-bold text-gradient">Pool</div>
              <div className="text-sm text-gray-400">Cetus LP creation</div>
            </div>
          </div>
        </div>
      </section>
      
      <CreateCoinModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}
