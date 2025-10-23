'use client';

import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useBondingCurves } from '@/lib/hooks/useBondingCurves';
import { TradingModal } from '@/components/modals/TradingModal';
import { useState, useEffect } from 'react';

export default function TokenPage() {
  const params = useParams();
  const tokenId = params.id as string;
  const { data: curves, isLoading } = useBondingCurves();
  const [showTrading, setShowTrading] = useState(false);
  
  // Find the token by ID
  const token = curves?.find(c => c.id === tokenId);

  // Auto-open trading modal when token is loaded
  useEffect(() => {
    if (token && !showTrading) {
      setShowTrading(true);
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">🔍</div>
            <h3 className="text-2xl font-bold mb-2">Loading token...</h3>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-2xl font-bold mb-2">Token Not Found</h3>
            <p className="text-gray-400 mb-6">This token doesn't exist or hasn't been created yet.</p>
            <a
              href="/tokens"
              className="inline-block px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Browse All Tokens
            </a>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Token will be displayed via the trading modal */}
        {token && (
          <TradingModal
            isOpen={showTrading}
            onClose={() => {
              setShowTrading(false);
              // Redirect back to tokens list after closing
              setTimeout(() => {
                window.location.href = '/tokens';
              }, 300);
            }}
            curve={token}
          />
        )}
      </main>
      <BottomNav />
    </div>
  );
}
