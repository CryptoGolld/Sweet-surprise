'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACTS } from '@/lib/constants';
import { toast } from 'sonner';
import { getExplorerLink } from '@/lib/sui/client';

// Admin addresses - add your wallet address here
const ADMIN_ADDRESSES = [
  // Add your admin wallet addresses here
  // '0x...',
];

export default function AdminPage() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  // Simple password protection (for extra security, move this to env)
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

  // Platform config state
  const [feePercent, setFeePercent] = useState('');
  const [referralPercent, setReferralPercent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (currentAccount) {
      const isAdminAddress = ADMIN_ADDRESSES.includes(currentAccount.address);
      setIsAdmin(isAdminAddress);
    }
  }, [currentAccount]);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      toast.success('Welcome, Admin!');
    } else {
      toast.error('Invalid password');
    }
  }

  async function updateFeePercent() {
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!feePercent || parseFloat(feePercent) < 0 || parseFloat(feePercent) > 100) {
      toast.error('Please enter a valid fee percentage (0-100)');
      return;
    }

    setIsProcessing(true);
    try {
      const tx = new Transaction();
      
      // Convert percentage to basis points (1% = 100 bp, max 10000 = 100%)
      const basisPoints = Math.floor(parseFloat(feePercent) * 100);

      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::platform::update_fee_percent`,
        arguments: [
          tx.object(CONTRACTS.PLATFORM_STATE),
          tx.object(CONTRACTS.ADMIN_CAP), // You'll need to add ADMIN_CAP to constants
          tx.pure.u64(basisPoints),
        ],
      });

      const result = await signAndExecute({ transaction: tx });
      
      toast.success('Fee updated!', {
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank'),
        },
      });
    } catch (error: any) {
      toast.error('Update failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function updateReferralPercent() {
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!referralPercent || parseFloat(referralPercent) < 0 || parseFloat(referralPercent) > 100) {
      toast.error('Please enter a valid referral percentage (0-100)');
      return;
    }

    setIsProcessing(true);
    try {
      const tx = new Transaction();
      
      const basisPoints = Math.floor(parseFloat(referralPercent) * 100);

      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::platform::update_referral_percent`,
        arguments: [
          tx.object(CONTRACTS.PLATFORM_STATE),
          tx.object(CONTRACTS.ADMIN_CAP),
          tx.pure.u64(basisPoints),
        ],
      });

      const result = await signAndExecute({ transaction: tx });
      
      toast.success('Referral updated!', {
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank'),
        },
      });
    } catch (error: any) {
      toast.error('Update failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function pausePlatform() {
    if (!confirm('Are you sure you want to PAUSE the platform? All trading will be disabled.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::platform::pause`,
        arguments: [
          tx.object(CONTRACTS.PLATFORM_STATE),
          tx.object(CONTRACTS.ADMIN_CAP),
        ],
      });

      const result = await signAndExecute({ transaction: tx });
      
      toast.success('Platform paused!', {
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank'),
        },
      });
    } catch (error: any) {
      toast.error('Pause failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function unpausePlatform() {
    setIsProcessing(true);
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::platform::unpause`,
        arguments: [
          tx.object(CONTRACTS.PLATFORM_STATE),
          tx.object(CONTRACTS.ADMIN_CAP),
        ],
      });

      const result = await signAndExecute({ transaction: tx });
      
      toast.success('Platform unpaused!', {
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank'),
        },
      });
    } catch (error: any) {
      toast.error('Unpause failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-sui-dark">
        <Header />
        <main className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h1 className="text-3xl font-bold mb-6 text-center text-gradient">🔐 Admin Access</h1>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors"
                    placeholder="Enter admin password"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform"
                >
                  Login
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sui-dark">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-gradient">⚙️ Admin Panel</h1>

        {!currentAccount && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <p className="text-yellow-400">⚠️ Please connect your wallet to execute admin commands</p>
          </div>
        )}

        {currentAccount && !isAdmin && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">❌ Your wallet address is not authorized as admin</p>
            <p className="text-sm text-gray-400 mt-2">Connected: {currentAccount.address.slice(0, 10)}...</p>
          </div>
        )}

        {/* Platform Fee Settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">💰 Platform Fee</h2>
          <p className="text-gray-400 text-sm mb-4">Update the platform fee percentage (0-100%)</p>
          
          <div className="flex gap-3">
            <input
              type="number"
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
              placeholder="e.g. 1 for 1%"
              step="0.01"
              min="0"
              max="100"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors"
            />
            <button
              onClick={updateFeePercent}
              disabled={isProcessing || !currentAccount || !isAdmin}
              className="px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {isProcessing ? '⏳' : 'Update'}
            </button>
          </div>
        </div>

        {/* Referral Fee Settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">🎁 Referral Rewards</h2>
          <p className="text-gray-400 text-sm mb-4">Update the referral reward percentage (0-100%)</p>
          
          <div className="flex gap-3">
            <input
              type="number"
              value={referralPercent}
              onChange={(e) => setReferralPercent(e.target.value)}
              placeholder="e.g. 5 for 5%"
              step="0.01"
              min="0"
              max="100"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors"
            />
            <button
              onClick={updateReferralPercent}
              disabled={isProcessing || !currentAccount || !isAdmin}
              className="px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {isProcessing ? '⏳' : 'Update'}
            </button>
          </div>
        </div>

        {/* Platform Controls */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">🎛️ Platform Controls</h2>
          <p className="text-gray-400 text-sm mb-4">Emergency controls to pause/unpause the platform</p>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={pausePlatform}
              disabled={isProcessing || !currentAccount || !isAdmin}
              className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              ⏸️ Pause Platform
            </button>
            <button
              onClick={unpausePlatform}
              disabled={isProcessing || !currentAccount || !isAdmin}
              className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              ▶️ Unpause Platform
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            <strong>ℹ️ Note:</strong> All commands require the AdminCap object. Make sure you have it in your wallet.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            AdminCap Object ID: {CONTRACTS.ADMIN_CAP || '(Not configured)'}
          </p>
        </div>
      </main>
    </div>
  );
}
