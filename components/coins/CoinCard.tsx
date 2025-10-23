'use client';

import { useState } from 'react';
import { BondingCurve } from '@/lib/hooks/useBondingCurves';
import { TradingModal } from '../modals/TradingModal';
import { truncateAddress, formatAmount, calculatePercentage } from '@/lib/sui/client';
import { BONDING_CURVE } from '@/lib/constants';

interface CoinCardProps {
  curve: BondingCurve;
}

export function CoinCard({ curve }: CoinCardProps) {
  const [showTrading, setShowTrading] = useState(false);

  const progress = calculatePercentage(
    curve.curveSupply,
    BONDING_CURVE.MAX_CURVE_SUPPLY * 1e9 // Convert to smallest units
  );

  const marketCap = formatAmount(curve.curveBalance, 9);
  const tokensTraded = formatAmount(curve.curveSupply, 9);

  return (
    <>
      <div
        onClick={() => setShowTrading(true)}
        className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all hover:scale-[1.01] hover:border-meme-purple/50 hover:shadow-xl hover:shadow-meme-purple/10 cursor-pointer group"
      >
        {/* Image */}
        <div className="relative aspect-square bg-gradient-to-br from-meme-pink/20 via-meme-purple/20 to-sui-blue/20 flex items-center justify-center overflow-hidden">
          {curve.imageUrl ? (
            <img
              src={curve.imageUrl}
              alt={curve.ticker}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center w-full h-full"><span class="text-6xl">🚀</span></div>';
              }}
            />
          ) : (
            <span className="text-6xl">🚀</span>
          )}
          
          {/* Status badge */}
          <div className="absolute top-2 right-2">
            {curve.graduated ? (
              <div className="bg-green-500/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                🎓 <span className="hidden sm:inline">Graduated</span>
              </div>
            ) : (
              <div className="bg-meme-purple/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                🔥 <span className="hidden sm:inline">Live</span>
              </div>
            )}
          </div>

          {/* Quick stats overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-xs text-white/90 font-medium">
              {progress.toFixed(1)}% to graduation
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold truncate mb-0.5">${curve.ticker}</h3>
              <p className="text-xs text-gray-400 truncate">{curve.name || 'Untitled'}</p>
            </div>
            <div className="text-right ml-3 flex-shrink-0">
              <div className="text-sm font-bold text-meme-purple">{marketCap}</div>
              <div className="text-xs text-gray-400">SUILFG</div>
            </div>
          </div>

          {/* Description */}
          {curve.description && (
            <p className="text-xs text-gray-300 mb-3 line-clamp-2 leading-relaxed">
              {curve.description}
            </p>
          )}

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">Bonding Curve</span>
              <span className="font-semibold text-meme-purple">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-meme-pink via-meme-purple to-sui-blue transition-all duration-500 shadow-sm shadow-meme-purple/50"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-xs text-gray-400 mb-0.5">Volume</div>
              <div className="text-sm font-bold">{tokensTraded}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-xs text-gray-400 mb-0.5">Created</div>
              <div className="text-sm font-bold">{new Date(curve.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-xs text-gray-400">by {truncateAddress(curve.creator)}</span>
            <button className="text-xs font-semibold text-meme-purple hover:text-meme-pink transition-colors">
              Trade →
            </button>
          </div>
        </div>
      </div>

      <TradingModal
        isOpen={showTrading}
        onClose={() => setShowTrading(false)}
        curve={curve}
      />
    </>
  );
}
