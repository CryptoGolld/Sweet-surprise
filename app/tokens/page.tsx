'use client';

import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CoinList } from '@/components/coins/CoinList';

export default function TokensPage() {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            🔥 <span className="text-gradient">All Tokens</span>
          </h1>
          <p className="text-gray-400">
            Explore all memecoins launched on SuiLFG MemeFi
          </p>
        </div>
        
        <CoinList />
      </main>
      
      <BottomNav />
    </div>
  );
}
