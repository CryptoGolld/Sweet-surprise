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
        className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all hover:scale-[1.02] hover:border-meme-purple/50 cursor-pointer card-shine group"
      >
        {/* Image */}
        <div className="aspect-square bg-gradient-to-br from-meme-pink/20 via-meme-purple/20 to-sui-blue/20 flex items-center justify-center text-6xl relative overflow-hidden">
          {curve.imageUrl ? (
            <img
              src={curve.imageUrl}
              alt={curve.ticker}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<span class="animate-float text-6xl">🚀</span>';
              }}
            />
          ) : (
            <span className="animate-float">🚀</span>
          )}
          
          {/* Status badge */}
          {curve.graduated ? (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              🎓 Graduated
            </div>
          ) : (
            <div className="absolute top-2 right-2 bg-blue-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              🔥 Trading
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold truncate">${curve.ticker}</h3>
              <p className="text-sm text-gray-400 truncate">{curve.name}</p>
            </div>
            <div className="text-right ml-4">
              <div className="text-lg font-bold text-sui-blue">{marketCap}</div>
              <div className="text-xs text-gray-400">Ⓢ Collected</div>
            </div>
          </div>

          {/* Description */}
          {curve.description && (
            <p className="text-sm text-gray-300 mb-4 line-clamp-2">
              {curve.description}
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-sm font-bold">{tokensTraded}</div>
              <div className="text-xs text-gray-400">Tokens Traded</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-sm font-bold">{progress.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">Progress</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Graduation</span>
              <span>{progress.toFixed(2)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-meme-pink via-meme-purple to-sui-blue transition-all duration-500"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>

          {/* Creator & Date */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/10">
            <span>by {truncateAddress(curve.creator)}</span>
            <span>{new Date(curve.createdAt).toLocaleDateString()}</span>
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
