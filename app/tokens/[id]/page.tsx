'use client';

import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useBondingCurves } from '@/lib/hooks/useBondingCurves';
import { TradingModal } from '@/components/modals/TradingModal';
import { useState } from 'react';

export default function TokenPage() {
  const params = useParams();
  const tokenId = params.id as string;
  const { data: curves, isLoading } = useBondingCurves();
  const [showTrading, setShowTrading] = useState(false);
  
  // Find the token by ID
  const token = curves?.find(c => c.id === tokenId);

  // Auto-open trading modal disabled - user can manually open it
  // useEffect(() => {
  //   if (token && !showTrading) {
  //     setShowTrading(true);
  //   }
  // }, [token]);

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
        {/* Token Info Card with Trade Button */}
        {token && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-meme-pink/20 to-sui-blue/20 rounded-lg flex items-center justify-center text-4xl overflow-hidden">
                  {token.imageUrl ? (
                    <img src={token.imageUrl} alt={token.ticker} className="w-full h-full object-cover" />
                  ) : (
                    '🚀'
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold">${token.ticker}</h1>
                  <p className="text-gray-400">{token.name}</p>
                </div>
              </div>

              {token.description && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-gray-300 text-sm">{token.description}</p>
                </div>
              )}

              <button
                onClick={() => setShowTrading(true)}
                className="w-full py-4 bg-gradient-to-r from-meme-pink to-meme-purple hover:from-meme-pink/80 hover:to-meme-purple/80 rounded-lg font-bold text-lg transition-all hover:scale-105"
              >
                🔥 Open Trading
              </button>
            </div>

            <a
              href="/tokens"
              className="inline-block text-gray-400 hover:text-white transition-colors"
            >
              ← Back to all tokens
            </a>
          </div>
        )}

        {token && (
          <TradingModal
            isOpen={showTrading}
            onClose={() => setShowTrading(false)}
            curve={token}
          />
        )}
      </main>
      <BottomNav />
    </div>
  );
}
