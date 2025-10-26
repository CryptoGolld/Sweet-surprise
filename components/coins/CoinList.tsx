'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CoinCard } from './CoinCard';

type SortOption = 'newest' | 'marketcap' | 'progress' | 'volume';
type FilterTab = 'all' | 'trading' | 'graduated';

// Indexer API endpoint
const INDEXER_API = 'http://13.60.235.109:3002';

interface Token {
  id: string;
  coinType: string;
  ticker: string;
  name: string;
  description: string;
  imageUrl: string;
  creator: string;
  curveSupply: string;
  curveBalance: string;
  graduated: boolean;
  createdAt: number;
  currentPrice: number;
  marketCap: number;
  fullyDilutedValuation: number;
  volume24h: string;
  priceChange24h: number;
  allTimeHigh: number;
  allTimeLow: number;
  lastTradeAt: number | null;
}

export function CoinList() {
  // Fetch from indexer API instead of blockchain
  const { data: tokensResponse, isLoading, error } = useQuery({
    queryKey: ['indexer-tokens'],
    queryFn: async () => {
      const response = await fetch(`${INDEXER_API}/api/tokens?limit=1000&sort=newest`);
      if (!response.ok) throw new Error('Failed to fetch tokens from indexer');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 3000,
  });

  const curves: Token[] = tokensResponse?.tokens || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Filter and sort coins
  const filteredAndSortedCurves = useMemo(() => {
    if (!curves) return [];

    // Filter by search query
    let filtered = curves.filter((curve: Token) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      
      return (
        curve.ticker.toLowerCase().includes(query) ||
        curve.name.toLowerCase().includes(query) ||
        curve.id.toLowerCase().includes(query) ||
        curve.coinType.toLowerCase().includes(query)
      );
    });

    // Filter by tab
    if (filterTab === 'trading') {
      filtered = filtered.filter((c) => !c.graduated);
    } else if (filterTab === 'graduated') {
      filtered = filtered.filter((c) => c.graduated);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'marketcap':
          return Number(b.curveBalance) - Number(a.curveBalance);
        case 'progress':
          // NOTE: curveSupply is already in whole tokens
          const progressA = Number(a.curveSupply) / 737_000_000;
          const progressB = Number(b.curveSupply) / 737_000_000;
          return progressB - progressA;
        case 'volume':
          return Number(b.curveSupply) - Number(a.curveSupply);
        default:
          return 0;
      }
    });

    return sorted;
  }, [curves, searchQuery, sortBy, filterTab]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Search skeleton */}
        <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
        
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-white/10" />
              <div className="p-4 space-y-2">
                <div className="h-6 bg-white/10 rounded" />
                <div className="h-4 bg-white/10 rounded w-2/3" />
                <div className="h-12 bg-white/10 rounded" />
                <div className="h-2 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-2xl font-bold mb-2">Failed to load coins</h3>
        <p className="text-gray-400 mb-4">Please try refreshing the page</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform"
        >
          Refresh
        </button>
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
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Search by name, ticker, or token ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-meme-purple/50 focus:ring-2 focus:ring-meme-purple/20 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filterTab === 'all'
              ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          🔥 All ({curves.length})
        </button>
        <button
          onClick={() => setFilterTab('trading')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filterTab === 'trading'
              ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          📈 Trading ({curves.filter((c) => !c.graduated).length})
        </button>
        <button
          onClick={() => setFilterTab('graduated')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filterTab === 'graduated'
              ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          🎓 Graduated ({curves.filter((c) => c.graduated).length})
        </button>
      </div>

      {/* Sort Options */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-400">Sort by:</span>
        {[
          { value: 'newest', label: '🆕 Newest', emoji: '🆕' },
          { value: 'marketcap', label: '💰 Market Cap', emoji: '💰' },
          { value: 'progress', label: '📊 Progress', emoji: '📊' },
          { value: 'volume', label: '📈 Volume', emoji: '📈' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setSortBy(option.value as SortOption)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sortBy === option.value
                ? 'bg-meme-purple/20 text-meme-purple border border-meme-purple/50'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      {searchQuery && (
        <div className="text-sm text-gray-400">
          Found {filteredAndSortedCurves.length} coin{filteredAndSortedCurves.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Coins Grid */}
      {filteredAndSortedCurves.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-bold mb-2">No coins found</h3>
          <p className="text-gray-400 mb-4">
            {searchQuery
              ? `No results for "${searchQuery}"`
              : 'No coins match the selected filter'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedCurves.map((curve) => (
            <CoinCard key={curve.id} curve={curve} />
          ))}
        </div>
      )}
    </div>
  );
}
