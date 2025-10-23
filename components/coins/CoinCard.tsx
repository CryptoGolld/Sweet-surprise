'use client';

import { useState } from 'react';
import { BondingCurve } from '@/lib/hooks/useBondingCurves';
import { TradingModal } from '../modals/TradingModal';
import { truncateAddress, formatAmount, calculatePercentage } from '@/lib/sui/client';
import { BONDING_CURVE } from '@/lib/constants';
import { useSuiPrice, formatUSD } from '@/lib/hooks/useSuiPrice';

interface CoinCardProps {
  curve: BondingCurve;
}

export function CoinCard({ curve }: CoinCardProps) {
  const [showTrading, setShowTrading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: suiPrice = 1.0 } = useSuiPrice();

  const progress = calculatePercentage(
    curve.curveSupply,
    BONDING_CURVE.MAX_CURVE_SUPPLY * 1e9
  );

  const suiCollected = Number(curve.curveBalance) / 1e9;
  const tokensTraded = formatAmount(curve.curveSupply, 9);
  const age = Math.floor((Date.now() - curve.createdAt) / (1000 * 60)); // minutes

  // Calculate Market Cap: Price per token * Total Supply
  // Price per token = SUI collected / tokens sold (if any sold)
  const tokensSold = Number(curve.curveSupply) / 1e9;
  const pricePerToken = tokensSold > 0 ? suiCollected / tokensSold : 0;
  const totalSupply = BONDING_CURVE.TOTAL_SUPPLY; // 1B tokens
  const marketCapSui = pricePerToken * totalSupply;
  const marketCapUsd = marketCapSui * suiPrice;

  const formatAge = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <>
      <div
        className={`bg-white/5 border border-white/10 rounded-lg overflow-hidden transition-all hover:bg-white/10 hover:border-meme-purple/50 hover:shadow-lg hover:shadow-meme-purple/10 ${
          isExpanded ? '' : 'cursor-pointer'
        }`}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {/* Compact View */}
        {!isExpanded ? (
          <div className="p-3 flex items-center gap-3">
            {/* Token Image - Smaller */}
            <div className="w-10 h-10 flex-shrink-0">
              {curve.imageUrl ? (
                <img
                  src={curve.imageUrl}
                  alt={curve.ticker}
                  className="w-full h-full rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement!;
                    parent.innerHTML = '<div class="w-10 h-10 bg-gradient-to-br from-meme-pink/30 to-meme-purple/30 rounded-lg flex items-center justify-center text-xl">🚀</div>';
                  }}
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-meme-pink/30 to-meme-purple/30 rounded-lg flex items-center justify-center text-xl">
                  🚀
                </div>
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

            {/* Expand Icon */}
            <div className="flex-shrink-0 text-gray-400 text-xs">
              ▼
            </div>
          </div>
        ) : (
          /* Expanded View */
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              {/* Image */}
              <div className="w-20 h-20 flex-shrink-0">
                {curve.imageUrl ? (
                  <img
                    src={curve.imageUrl}
                    alt={curve.ticker}
                    className="w-full h-full rounded-xl object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement!;
                      parent.innerHTML = '<div class="w-20 h-20 bg-gradient-to-br from-meme-pink/30 to-meme-purple/30 rounded-xl flex items-center justify-center text-4xl">🚀</div>';
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-meme-pink/30 to-meme-purple/30 rounded-xl flex items-center justify-center text-4xl">
                    🚀
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">${curve.ticker}</h3>
                    <p className="text-sm text-gray-400">{curve.name || 'Untitled'}</p>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-400 hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Status Badge */}
                <div className="inline-block">
                  {curve.graduated ? (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                      🎓 Graduated
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-meme-purple/20 text-meme-purple text-xs font-semibold rounded-full border border-meme-purple/30">
                      🔥 Trading Live
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {curve.description && (
              <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                {curve.description}
              </p>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Market Cap</div>
                <div className="text-lg font-bold text-meme-purple">{formatUSD(marketCapUsd)}</div>
                <div className="text-xs text-gray-500">{suiCollected.toFixed(2)} SUI</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Volume</div>
                <div className="text-lg font-bold">{tokensTraded}</div>
                <div className="text-xs text-gray-500">Tokens</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Progress</div>
                <div className="text-lg font-bold">{progress.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">to Graduation</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Age</div>
                <div className="text-lg font-bold">{formatAge(age)}</div>
                <div className="text-xs text-gray-500">Created</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>Bonding Curve Progress</span>
                <span className="font-semibold text-meme-purple">{progress.toFixed(2)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-meme-pink via-meme-purple to-sui-blue transition-all duration-500 shadow-sm shadow-meme-purple/50"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="text-xs text-gray-400">
                Created by {truncateAddress(curve.creator)} • {new Date(curve.createdAt).toLocaleDateString()}
              </div>
              <button
                onClick={() => setShowTrading(true)}
                className="px-6 py-2 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform"
              >
                Trade
              </button>
            </div>
          </div>
        )}
      </div>

      <TradingModal
        isOpen={showTrading}
        onClose={() => setShowTrading(false)}
        curve={curve}
      />
    </>
  );
}
