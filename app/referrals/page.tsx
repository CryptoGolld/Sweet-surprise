'use client';

import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ReferralsPage() {
  const account = useCurrentAccount();
  const [copied, setCopied] = useState(false);

  const referralCode = account?.address ? account.address.slice(0, 8) : '';
  const referralLink = account?.address 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/tokens?ref=${account.address}`
    : '';

  function copyReferralLink() {
    if (!account?.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      toast.success('Referral link copied!', {
        description: 'Share it with your friends to earn rewards',
      });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  }

  if (!account) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
              <div className="text-6xl mb-4">🔗</div>
              <h3 className="text-2xl font-bold mb-2">Connect Your Wallet</h3>
              <p className="text-gray-400">Connect your wallet to view your referral link</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="text-gradient">Referral Program</span> 🎁
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Earn rewards by inviting friends to trade memecoins
            </p>
          </div>

          {/* Referral Link Card */}
          <div className="bg-gradient-to-br from-meme-pink/20 via-meme-purple/20 to-sui-blue/20 border-2 border-white/20 rounded-2xl p-6 md:p-8 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-2xl">🔗</div>
              <h2 className="text-xl md:text-2xl font-bold">Your Referral Link</h2>
            </div>
            
            {/* Referral Code */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Your Referral Code</label>
              <div className="bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-lg text-center">
                {referralCode}
              </div>
            </div>

            {/* Referral Link */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Full Referral Link</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-sm break-all">
                  {referralLink}
                </div>
                <button
                  onClick={copyReferralLink}
                  className={`px-6 py-4 rounded-lg font-semibold transition-all ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-meme-pink to-meme-purple hover:scale-105'
                  }`}
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-400 text-center mt-4">
              Share this link with friends. When they trade, you earn rewards! 🎉
            </p>
          </div>

          {/* How It Works */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>💡</span> How It Works
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-meme-pink to-meme-purple rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Share Your Link</h4>
                  <p className="text-sm text-gray-400">
                    Copy and share your referral link with friends on social media, Discord, or anywhere else
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-meme-purple to-sui-blue rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">They Trade</h4>
                  <p className="text-sm text-gray-400">
                    When someone uses your link and makes their first trade, you'll be registered as their referrer
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-sui-blue to-green-500 rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Earn Rewards</h4>
                  <p className="text-sm text-gray-400">
                    You'll earn a percentage of the platform fees from all their trades automatically
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>📊</span> Your Stats
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-meme-pink mb-1">0</div>
                <div className="text-xs text-gray-400">Referrals</div>
              </div>
              
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-meme-purple mb-1">0</div>
                <div className="text-xs text-gray-400">Total Trades</div>
              </div>
              
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-sui-blue mb-1">0 SUI</div>
                <div className="text-xs text-gray-400">Earned</div>
              </div>
              
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-green-400 mb-1">0%</div>
                <div className="text-xs text-gray-400">Commission</div>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Note: Live stats coming soon! The indexer is tracking all referral data.
            </p>
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
