'use client';

import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CoinList } from '@/components/coins/CoinList';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getReferrerAddress } from '@/lib/utils/referrals';

function ReferralCapture() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const ref = searchParams?.get('ref');
    if (ref && ref.startsWith('0x')) {
      getReferrerAddress();
      console.log('📎 Referral captured:', ref.slice(0, 10) + '...');
    }
  }, [searchParams]);
  
  return null;
}

export default function TokensPage() {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-gradient">Explore Memecoins</span> 🚀
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Trade, discover, and launch the next big memecoin on Sui
          </p>
        </div>
        
        {/* Coin List with Search & Filters */}
        <CoinList />
      </main>
      
      <BottomNav />
    </div>
  );
}
