'use client';

import { Hero } from '@/components/Hero';
import { Header } from '@/components/Header';
import { SimpleCoinList } from '@/components/SimpleCoinList';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header onCreateClick={() => alert('Coming soon!')} />
      
      <main className="container mx-auto px-4 py-8">
        <Hero onCreateClick={() => alert('Coming soon!')} />
        
        <section className="mt-16">
          <h2 className="text-3xl font-bold mb-8">
            🔥 <span className="text-gradient">Live Coins</span>
          </h2>
          
          <SimpleCoinList />
        </section>
      </main>
      
      <footer className="mt-24 border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p className="mb-4">
            <span className="text-gradient font-bold">SuiLFG MemeFi</span> - Launching Soon on Sui Testnet
          </p>
          <p className="text-sm">
            🚀 Launch • 📈 Trade • 🎓 Graduate • 🏊 Pool
          </p>
        </div>
      </footer>
    </div>
  );
}
