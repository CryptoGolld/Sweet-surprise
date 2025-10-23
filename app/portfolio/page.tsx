'use client';

import { Header } from '@/components/Header';
import { UserPortfolio } from '@/components/portfolio/UserPortfolio';
import { useCurrentAccount } from '@mysten/dapp-kit';

export default function PortfolioPage() {
  const account = useCurrentAccount();

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            💼 <span className="text-gradient">Your Portfolio</span>
          </h1>
          <p className="text-gray-400">
            Track your memecoin holdings and performance
          </p>
        </div>
        
        {account ? (
          <UserPortfolio />
        ) : (
          <div className="text-center py-20">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 max-w-md mx-auto">
              <div className="text-6xl mb-4">👛</div>
              <h3 className="text-2xl font-bold mb-4">Connect Your Wallet</h3>
              <p className="text-gray-400">
                Connect your wallet to view your portfolio and track your memecoin investments
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
