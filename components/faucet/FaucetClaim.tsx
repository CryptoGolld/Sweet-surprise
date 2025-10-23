'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACTS } from '@/lib/constants';
import { toast } from 'sonner';
import { getExplorerLink } from '@/lib/sui/client';

export function FaucetClaim() {
  const currentAccount = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [isClaiming, setIsClaiming] = useState(false);
  const [timeUntilClaim, setTimeUntilClaim] = useState<number | null>(null);

  // Check remaining time until next claim
  useEffect(() => {
    if (!currentAccount) return;

    const checkClaimTime = async () => {
      try {
        // Call time_until_next_claim view function
        const result = await client.devInspectTransactionBlock({
          sender: currentAccount.address,
          transactionBlock: (() => {
            const tx = new Transaction();
            tx.moveCall({
              target: `${CONTRACTS.FAUCET_PACKAGE}::faucet::time_until_next_claim`,
              arguments: [
                tx.object(CONTRACTS.FAUCET_OBJECT),
                tx.pure.address(currentAccount.address),
                tx.object('0x6'), // Clock
              ],
            });
            return tx;
          })(),
        });

        if (result.results?.[0]?.returnValues?.[0]) {
          const bytes = result.results[0].returnValues[0][0];
          const timeMs = Number(BigInt('0x' + Buffer.from(bytes).toString('hex')));
          setTimeUntilClaim(timeMs);
        }
      } catch (error) {
        console.error('Failed to check claim time:', error);
      }
    };

    checkClaimTime();
    const interval = setInterval(checkClaimTime, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [currentAccount, client]);

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
        // Reset timer after successful claim
        setTimeUntilClaim(21600000); // 6 hours in ms
        
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
      
      // Check if it's the "claim too soon" error (0x1)
      if (error.message?.includes('0x1') || error.message?.includes('EClaimTooSoon')) {
        const hours = timeUntilClaim ? Math.floor(timeUntilClaim / 3600000) : 0;
        const minutes = timeUntilClaim ? Math.floor((timeUntilClaim % 3600000) / 60000) : 0;
        
        toast.error('⏳ Claim Too Soon', {
          description: `You can claim again in ${hours}h ${minutes}m. Check back later!`,
          duration: 8000,
        });
      } else {
        toast.error('Failed to claim tokens', {
          description: error.message || 'Please try again',
        });
      }
    } finally {
      setIsClaiming(false);
    }
  }
  
  // Format time remaining
  function formatTimeRemaining(ms: number): string {
    if (ms <= 0) return 'Now';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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
        <>
          {timeUntilClaim !== null && timeUntilClaim > 0 && (
            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
              <div className="text-yellow-400 font-semibold mb-1">⏳ Cooldown Active</div>
              <div className="text-sm text-gray-300">
                Next claim in: <span className="font-bold">{formatTimeRemaining(timeUntilClaim)}</span>
              </div>
            </div>
          )}
          
          <button
            onClick={handleClaim}
            disabled={isClaiming || (timeUntilClaim !== null && timeUntilClaim > 0)}
            className="w-full px-6 py-4 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isClaiming ? '⏳ Claiming...' : 
             timeUntilClaim !== null && timeUntilClaim > 0 ? `⏳ Wait ${formatTimeRemaining(timeUntilClaim)}` :
             '💧 Claim 100 SUILFG_MEMEFI'}
          </button>
        </>
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
