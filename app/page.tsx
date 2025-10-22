'use client';

import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { CoinList } from '@/components/coins/CoinList';
import { UserPortfolio } from '@/components/portfolio/UserPortfolio';
import { useCurrentAccount } from '@mysten/dapp-kit';

export default function Home() {
  const account = useCurrentAccount();

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Hero />
        
        {/* User Portfolio (only show if connected) */}
        {account && (
          <section id="portfolio" className="mt-16">
            <h2 className="text-3xl font-bold mb-8">
              💼 <span className="text-gradient">Your Portfolio</span>
            </h2>
            <UserPortfolio />
          </section>
        )}
        
        {/* Coins List */}
        <section id="coins" className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">
              🔥 <span className="text-gradient">Live Coins</span>
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live on Testnet</span>
            </div>
          </div>
          
          <CoinList />
        </section>
      </main>
      
      <footer className="mt-24 border-t border-white/10 py-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-gradient mb-3">SuiLFG MemeFi</h3>
              <p className="text-sm text-gray-400">
                The premier memecoin launchpad on Sui blockchain. Fair launch with bonding curves.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-3">Platform</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• 737M tokens per curve</li>
                <li>• Fair bonding curve pricing</li>
                <li>• Auto-graduation at 13K SUI</li>
                <li>• Cetus LP integration</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3">Links</h3>
              <ul className="space-y-2 text-sm">
                <a
                  href="https://suiscan.xyz/testnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors block"
                >
                  → SuiScan Explorer
                </a>
                <a
                  href="https://docs.sui.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors block"
                >
                  → Sui Documentation
                </a>
              </ul>
            </div>
          </div>
          
          <div className="text-center text-gray-400 text-sm pt-8 border-t border-white/10">
            <p className="mb-2">
              <span className="text-gradient font-bold">SuiLFG MemeFi</span> - Built on Sui
            </p>
            <p className="text-xs text-gray-500">
              🚀 Testnet Campaign
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
