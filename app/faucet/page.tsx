'use client';

import { Header } from '@/components/Header';
import { FaucetClaim } from '@/components/faucet/FaucetClaim';

export default function FaucetPage() {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4">
              💧 <span className="text-gradient">SUILFG_MEMEFI Faucet</span>
            </h1>
            <p className="text-gray-400">
              Get free SUILFG_MEMEFI tokens to start trading memecoins
            </p>
          </div>
          
          <FaucetClaim />
          
          {/* Info Box */}
          <div className="mt-8 bg-sui-blue/10 border border-sui-blue/30 rounded-lg p-6">
            <h3 className="font-bold text-sui-blue mb-3">ℹ️ About SUILFG_MEMEFI</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Trading currency for all memecoins on the platform</li>
              <li>• 9 decimals precision</li>
              <li>• Faucet provides 1,000 tokens per claim</li>
              <li>• Testnet only - not real money</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
