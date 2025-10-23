'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACTS } from '@/lib/constants';
import { toast } from 'sonner';
import { getExplorerLink } from '@/lib/sui/client';

export function FaucetClaim() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [isClaiming, setIsClaiming] = useState(false);

  async function handleClaim() {
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsClaiming(true);

    try {
      const tx = new Transaction();
      tx.setGasBudget(100_000_000);

      // Call faucet::claim function (entry function - no need to transfer)
      tx.moveCall({
        target: `${CONTRACTS.FAUCET_PACKAGE}::faucet::claim`,
        arguments: [
          tx.object(CONTRACTS.FAUCET_OBJECT),
          tx.object('0x6'), // Clock
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      if (result.digest) {
        toast.success('🎉 Claimed 100 SUILFG_MEMEFI!', {
          description: 'Tokens sent to your wallet. Can claim again in 6 hours.',
          action: {
            label: 'View',
            onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank'),
          },
          duration: 8000,
        });
      }
    } catch (error: any) {
      console.error('Faucet claim failed:', error);
      toast.error('Failed to claim tokens', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">💧</div>
        <h2 className="text-2xl font-bold mb-2">Claim Free Tokens</h2>
        <p className="text-gray-400">
          Get 100 SUILFG_MEMEFI tokens every 6 hours
        </p>
      </div>

      {currentAccount ? (
        <button
          onClick={handleClaim}
          disabled={isClaiming}
          className="w-full px-6 py-4 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          {isClaiming ? '⏳ Claiming...' : '💧 Claim 100 SUILFG_MEMEFI'}
        </button>
      ) : (
        <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
          <p className="text-gray-400 mb-4">Connect your wallet to claim tokens</p>
          <p className="text-sm text-gray-500">Use the "Connect Wallet" button in the header</p>
        </div>
      )}

      {/* Connected Wallet Info */}
      {currentAccount && (
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-xs text-gray-400 mb-1">Your Address:</p>
          <p className="text-sm font-mono break-all">{currentAccount.address}</p>
        </div>
      )}
    </div>
  );
}
