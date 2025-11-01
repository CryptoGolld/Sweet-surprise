'use client';

import { useState } from 'react';
import { BondingCurve } from '@/lib/hooks/useBondingCurves';
import { TradingModal } from '../modals/TradingModal';
import { calculatePercentage } from '@/lib/sui/client';
import { BONDING_CURVE } from '@/lib/constants';
import { useSuiPrice, formatUSD } from '@/lib/hooks/useSuiPrice';
import Link from 'next/link';

interface CoinCardProps {
  curve: BondingCurve;
}

export function CoinCard({ curve }: CoinCardProps) {
  const [showTrading, setShowTrading] = useState(false);
  const { data: suiPrice = 1.0 } = useSuiPrice();

  // CRITICAL: curve.curveSupply is ALREADY in whole tokens (not mist!)
  // MAX_CURVE_SUPPLY is also in whole tokens (737M), so compare directly
  const progress = calculatePercentage(
    curve.curveSupply,
    BONDING_CURVE.MAX_CURVE_SUPPLY
  );

  const age = Math.floor((Date.now() - curve.createdAt) / (1000 * 60)); // minutes

  // Use FDV (Fully Diluted Valuation) from indexer
  // After recalculation script runs, this will have correct values
  const fdvSui = curve.fullyDilutedValuation || 0;
  const marketCapUsd = fdvSui * suiPrice;

  const formatAge = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <>
      <Link 
        href={`/tokens/${curve.id}`}
        className="block bg-white/5 border border-white/10 rounded-lg overflow-hidden transition-all hover:bg-white/10 hover:border-meme-purple/50 hover:shadow-lg hover:shadow-meme-purple/10 cursor-pointer"
      >
        {/* Compact Card View */}
        {(
          <div className="p-3 flex items-center gap-3">
            {/* Token Image - Smaller */}
            <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-meme-pink/30 to-meme-purple/30 rounded-lg overflow-hidden">
              {curve.imageUrl ? (
                <img
                  src={curve.imageUrl}
                  alt={curve.ticker}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement!;
                    parent.innerHTML = '<div class="flex items-center justify-center w-full h-full text-xl">🚀</div>';
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-xl">🚀</div>
              )}
            </div>

            {/* Token Info - Compact */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base truncate">${curve.ticker}</h3>
                {curve.graduated ? (
                  <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-semibold rounded">
                    🎓
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-meme-purple/20 text-meme-purple text-[10px] font-semibold rounded">
                    🔥
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate leading-tight">{curve.name || 'Untitled'}</p>
            </div>

            {/* Stats - Always Visible */}
            <div className="flex items-center gap-4 text-xs flex-shrink-0">
              {/* Market Cap */}
              <div className="text-right">
                <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">MC</div>
                <div className="font-bold text-meme-purple">{formatUSD(marketCapUsd)}</div>
              </div>
              
              {/* Age */}
              <div className="text-right hidden sm:block">
                <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">Age</div>
                <div className="font-semibold">{formatAge(age)}</div>
              </div>
              
              {/* Progress */}
              <div className="text-right hidden md:block">
                <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">Prog</div>
                <div className="font-semibold">{progress.toFixed(0)}%</div>
              </div>
            </div>

            {/* Click hint */}
            <div className="flex-shrink-0 text-gray-400 text-xs">
              👁️
            </div>
          </div>
        )}
      </Link>

      <TradingModal
        isOpen={showTrading}
        onClose={() => setShowTrading(false)}
        curve={curve}
      />
    </>
  );
}
