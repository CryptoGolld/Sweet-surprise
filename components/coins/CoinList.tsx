'use client';

import { useBondingCurves } from '@/lib/hooks/useBondingCurves';
import { CoinCard } from './CoinCard';

export function CoinList() {
  const { data: curves, isLoading, error } = useBondingCurves();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-white/10" />
            <div className="p-6 space-y-3">
              <div className="h-6 bg-white/10 rounded" />
              <div className="h-4 bg-white/10 rounded w-2/3" />
              <div className="h-16 bg-white/10 rounded" />
              <div className="h-2 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-2xl font-bold mb-2">Failed to load coins</h3>
        <p className="text-gray-400">Please try refreshing the page</p>
      </div>
    );
  }

  if (!curves || curves.length === 0) {
    return (
      <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="text-2xl font-bold mb-2">No coins yet!</h3>
        <p className="text-gray-400 mb-4">Be the first to create a memecoin.</p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform"
        >
          Create First Coin
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {curves.map((curve) => (
        <CoinCard key={curve.id} curve={curve} />
      ))}
    </div>
  );
}
