'use client';

import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import Link from 'next/link';

import { BottomNav } from '@/components/BottomNav';

export default function Home() {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Hero />
        
        {/* Quick Actions */}
        <section className="mt-16">
          <h2 className="text-3xl font-bold mb-8 text-center">
            <span className="text-gradient">Get Started</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Link href="/faucet" className="group">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-meme-pink/50 transition-all duration-300 hover:scale-105">
                <div className="text-5xl mb-4">💧</div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-gradient">Get Tokens</h3>
                <p className="text-gray-400 text-sm">
                  Claim free SUILFG_MEMEFI tokens from the faucet
                </p>
              </div>
            </Link>
            
            <Link href="/tokens" className="group">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-meme-purple/50 transition-all duration-300 hover:scale-105">
                <div className="text-5xl mb-4">🔥</div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-gradient">Trade Memecoins</h3>
                <p className="text-gray-400 text-sm">
                  Buy and sell trending memecoins on bonding curves
                </p>
              </div>
            </Link>
            
            <Link href="/portfolio" className="group">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-sui-blue/50 transition-all duration-300 hover:scale-105">
                <div className="text-5xl mb-4">💼</div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-gradient">Your Portfolio</h3>
                <p className="text-gray-400 text-sm">
                  Track your holdings and manage your investments
                </p>
              </div>
            </Link>
          </div>
        </section>
        
        {/* How It Works */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold mb-12 text-center">
            <span className="text-gradient">How It Works</span>
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-meme-pink to-meme-purple rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-bold mb-2">Create Token</h3>
              <p className="text-sm text-gray-400">
                Launch your memecoin in 2 simple steps
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-meme-purple to-sui-blue rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-bold mb-2">Fair Launch</h3>
              <p className="text-sm text-gray-400">
                Bonding curve ensures fair pricing for all
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-sui-blue to-green-500 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-bold mb-2">Trade & Grow</h3>
              <p className="text-sm text-gray-400">
                Community trades up to 737M tokens
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-meme-pink rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="font-bold mb-2">Graduate</h3>
              <p className="text-sm text-gray-400">
                Auto-creates Cetus liquidity pool at 13K SUI
              </p>
            </div>
          </div>
        </section>
        
        {/* Platform Stats */}
        <section className="mt-24 bg-gradient-to-r from-meme-pink/10 to-meme-purple/10 border border-white/10 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-8 text-center">
            <span className="text-gradient">Platform Features</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient mb-2">Fair Launch</div>
              <p className="text-gray-400">Bonding curve pricing</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient mb-2">0.2 SUI</div>
              <p className="text-gray-400">Total cost to launch</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient mb-2">Auto LP</div>
              <p className="text-gray-400">Cetus integration</p>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="mt-24 border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p className="mb-2">
            <span className="text-gradient font-bold">SuiLFG MemeFi</span> - Built on Sui
          </p>
          <p className="text-xs text-gray-500">
            🚀 Testnet Campaign
          </p>
        </div>
      </footer>
      
      <BottomNav />
    </div>
  );
}
