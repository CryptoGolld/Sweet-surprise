'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACTS } from '@/lib/constants';
import { toast } from 'sonner';
import { getExplorerLink } from '@/lib/sui/client';
import { useQuery } from '@tanstack/react-query';

export default function AdminPage() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'graduated' | 'special'>('config');

  // Simple password protection
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

  // Platform config state
  const [config, setConfig] = useState({
    platformFeeBps: '',
    creatorFeeBps: '',
    firstBuyerFeeMist: '',
    graduationReward: '',
    platformCutBps: '',
    creatorGraduationPayout: '',
    cetusBumpBps: '',
    teamAllocation: '',
    referralFeeBps: '',
    lpBotAddress: '',
    lpRecipientAddress: '',
    treasuryAddress: '',
  });

  // Special launch settings
  const [specialLaunchSearch, setSpecialLaunchSearch] = useState('');
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [specialLaunchEnabled, setSpecialLaunchEnabled] = useState(false);

  // Fetch all tokens
  const { data: tokensData, refetch } = useQuery({
    queryKey: ['all-tokens', activeTab],
    queryFn: async () => {
      const response = await fetch('/api/proxy/tokens?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch tokens');
      return response.json();
    },
    enabled: authenticated,
  });

  const allTokens = tokensData?.tokens || [];
  const graduatedTokens = allTokens.filter((t: any) => t.graduated && !t.cetusPoolAddress) || [];
  
  // Filter tokens for special launch search
  const filteredTokensForSpecial = allTokens.filter((t: any) => {
    if (!specialLaunchSearch) return false;
    const search = specialLaunchSearch.toLowerCase();
    return (
      t.ticker?.toLowerCase().includes(search) ||
      t.name?.toLowerCase().includes(search) ||
      t.id?.toLowerCase().includes(search)
    );
  }).slice(0, 10); // Limit to 10 results

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      toast.success('Welcome, Admin!');
    } else {
      toast.error('Invalid password');
    }
  }

  async function updatePlatformFee() {
    if (!config.platformFeeBps) {
      toast.error('Enter platform fee in basis points');
      return;
    }
    setIsProcessing(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::platform_config::set_platform_fee`,
        arguments: [
          tx.object(CONTRACTS.ADMIN_CAP),
          tx.object(CONTRACTS.PLATFORM_STATE),
          tx.pure.u64(config.platformFeeBps),
        ],
      });
      const result = await signAndExecute({ transaction: tx });
      toast.success('Platform fee updated!', {
        action: { label: 'View', onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank') },
      });
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function updateCreatorFee() {
    if (!config.creatorFeeBps) {
      toast.error('Enter creator fee in basis points');
      return;
    }
    setIsProcessing(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::platform_config::set_creator_fee`,
        arguments: [
          tx.object(CONTRACTS.ADMIN_CAP),
          tx.object(CONTRACTS.PLATFORM_STATE),
          tx.pure.u64(config.creatorFeeBps),
        ],
      });
      const result = await signAndExecute({ transaction: tx });
      toast.success('Creator fee updated!', {
        action: { label: 'View', onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank') },
      });
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function updateFirstBuyerFee() {
    if (!config.firstBuyerFeeMist) {
      toast.error('Enter first buyer fee in MIST');
      return;
    }
    setIsProcessing(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::platform_config::set_first_buyer_fee`,
        arguments: [
          tx.object(CONTRACTS.ADMIN_CAP),
          tx.object(CONTRACTS.PLATFORM_STATE),
          tx.pure.u64(config.firstBuyerFeeMist),
        ],
      });
      const result = await signAndExecute({ transaction: tx });
      toast.success('First buyer fee updated!', {
        action: { label: 'View', onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank') },
      });
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function updateReferralFee() {
    if (!config.referralFeeBps) {
      toast.error('Enter referral fee in basis points');
      return;
    }
    setIsProcessing(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::platform_config::set_referral_fee_bps`,
        arguments: [
          tx.object(CONTRACTS.ADMIN_CAP),
          tx.object(CONTRACTS.PLATFORM_STATE),
          tx.pure.u64(config.referralFeeBps),
        ],
      });
      const result = await signAndExecute({ transaction: tx });
      toast.success('Referral fee updated!', {
        action: { label: 'View', onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank') },
      });
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function updateLpBotAddress() {
    if (!config.lpBotAddress || !config.lpBotAddress.startsWith('0x')) {
      toast.error('Enter valid LP bot address');
      return;
    }
    setIsProcessing(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::platform_config::set_lp_bot_address`,
        arguments: [
          tx.object(CONTRACTS.ADMIN_CAP),
          tx.object(CONTRACTS.PLATFORM_STATE),
          tx.pure.address(config.lpBotAddress),
        ],
      });
      const result = await signAndExecute({ transaction: tx });
      toast.success('LP bot address updated!', {
        action: { label: 'View', onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank') },
      });
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function updateLpRecipientAddress() {
    if (!config.lpRecipientAddress || !config.lpRecipientAddress.startsWith('0x')) {
      toast.error('Enter valid LP recipient address');
      return;
    }
    setIsProcessing(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::platform_config::set_lp_recipient_address`,
        arguments: [
          tx.object(CONTRACTS.ADMIN_CAP),
          tx.object(CONTRACTS.PLATFORM_STATE),
          tx.pure.address(config.lpRecipientAddress),
        ],
      });
      const result = await signAndExecute({ transaction: tx });
      toast.success('LP recipient address updated!', {
        action: { label: 'View', onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank') },
      });
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function distributePayout(token: any) {
    if (!confirm(`Distribute payout for ${token.ticker}?\n\nThis will send:\n- Creator payout\n- Platform cut\n- Remaining stays in reserve for LP`)) {
      return;
    }
    setIsProcessing(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::distribute_payouts`,
        typeArguments: [token.coinType],
        arguments: [
          tx.object(CONTRACTS.PLATFORM_STATE),
          tx.object(token.id),
        ],
      });
      const result = await signAndExecute({ transaction: tx });
      toast.success(`Payout distributed for ${token.ticker}!`, {
        action: { label: 'View', onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank') },
      });
      refetch();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function setSpecialLaunch() {
    if (!selectedToken) {
      toast.error('Please select a token first');
      return;
    }
    if (!confirm(`${specialLaunchEnabled ? 'ENABLE' : 'DISABLE'} special launch for ${selectedToken.ticker}?\n\nSpecial launch = Mint all 54M to treasury instead of burning\n\n⚠️ This can only be set BEFORE graduation!`)) {
      return;
    }
    setIsProcessing(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::set_special_launch`,
        typeArguments: [selectedToken.coinType],
        arguments: [
          tx.object(CONTRACTS.ADMIN_CAP),
          tx.object(selectedToken.id),
          tx.pure.bool(specialLaunchEnabled),
        ],
      });
      const result = await signAndExecute({ transaction: tx });
      toast.success(`Special launch ${specialLaunchEnabled ? 'enabled' : 'disabled'} for ${selectedToken.ticker}!`, {
        action: { label: 'View', onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank') },
      });
      setSelectedToken(null);
      setSpecialLaunchSearch('');
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function collectLpFees(token: any) {
    if (!confirm(`Collect LP fees for ${token.ticker}?`)) {
      return;
    }
    setIsProcessing(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::collect_lp_fees_from_locked_position`,
        typeArguments: [token.coinType],
        arguments: [
          tx.object(CONTRACTS.CETUS_GLOBAL_CONFIG),
          tx.object(token.id), // curve ID
        ],
      });
      const result = await signAndExecute({ transaction: tx });
      toast.success(`LP fees collected for ${token.ticker}!`, {
        action: { label: 'View', onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank') },
      });
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
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
    <div className="min-h-screen bg-sui-dark pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-4xl font-bold mb-8 text-gradient">⚙️ Admin Panel</h1>

        {!currentAccount && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <p className="text-yellow-400">⚠️ Please connect your wallet to execute admin commands</p>
          </div>
        )}

        {currentAccount && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-blue-400 font-semibold">✅ Wallet Connected</p>
            <p className="text-sm text-gray-400 mt-2">
              {currentAccount.address.slice(0, 20)}...{currentAccount.address.slice(-10)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              💡 AdminCap required: {CONTRACTS.ADMIN_CAP}
            </p>
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
          <p className="text-green-400 font-semibold">🔒 AdminCap Security</p>
          <p className="text-sm text-gray-400 mt-2">
            ✅ All admin functions use AdminCap by <strong>reference only</strong> - it never leaves your wallet
          </p>
          <p className="text-xs text-gray-500 mt-2">
            The AdminCap is only used for authorization checks. It cannot be transferred, consumed, or destroyed by these functions.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            ⚙️ Platform Config
          </button>
          <button
            onClick={() => setActiveTab('graduated')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap ${
              activeTab === 'graduated'
                ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            🎓 Graduated Tokens
          </button>
          <button
            onClick={() => setActiveTab('special')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap ${
              activeTab === 'special'
                ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            ⭐ Special Launch
          </button>
        </div>

        {/* Platform Config Tab */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Fee Settings */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">💰 Fee Settings</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Platform Fee (bps)</label>
                  <p className="text-xs text-gray-400 mb-2">Current: 250 bps (2.5%), Max: 10000 (100%)</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={config.platformFeeBps}
                      onChange={(e) => setConfig({...config, platformFeeBps: e.target.value})}
                      placeholder="250"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none"
                    />
                    <button
                      onClick={updatePlatformFee}
                      disabled={isProcessing || !currentAccount}
                      className="px-4 py-2 bg-meme-purple rounded-lg font-semibold disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Creator Fee (bps)</label>
                  <p className="text-xs text-gray-400 mb-2">Current: 50 bps (0.5%)</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={config.creatorFeeBps}
                      onChange={(e) => setConfig({...config, creatorFeeBps: e.target.value})}
                      placeholder="50"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none"
                    />
                    <button
                      onClick={updateCreatorFee}
                      disabled={isProcessing || !currentAccount}
                      className="px-4 py-2 bg-meme-purple rounded-lg font-semibold disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">First Buyer Fee (MIST)</label>
                  <p className="text-xs text-gray-400 mb-2">1 SUI = 1,000,000,000 MIST</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={config.firstBuyerFeeMist}
                      onChange={(e) => setConfig({...config, firstBuyerFeeMist: e.target.value})}
                      placeholder="1000000000"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none"
                    />
                    <button
                      onClick={updateFirstBuyerFee}
                      disabled={isProcessing || !currentAccount}
                      className="px-4 py-2 bg-meme-purple rounded-lg font-semibold disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Referral Fee (bps)</label>
                  <p className="text-xs text-gray-400 mb-2">Current: 10 bps (0.1%)</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={config.referralFeeBps}
                      onChange={(e) => setConfig({...config, referralFeeBps: e.target.value})}
                      placeholder="10"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none"
                    />
                    <button
                      onClick={updateReferralFee}
                      disabled={isProcessing || !currentAccount}
                      className="px-4 py-2 bg-meme-purple rounded-lg font-semibold disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">🏠 Addresses</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">LP Bot Address</label>
                  <p className="text-xs text-gray-400 mb-2">Address authorized to receive LP tokens for pool creation</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.lpBotAddress}
                      onChange={(e) => setConfig({...config, lpBotAddress: e.target.value})}
                      placeholder="0x..."
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none font-mono text-sm"
                    />
                    <button
                      onClick={updateLpBotAddress}
                      disabled={isProcessing || !currentAccount}
                      className="px-4 py-2 bg-meme-purple rounded-lg font-semibold disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">LP Fee Recipient Address</label>
                  <p className="text-xs text-gray-400 mb-2">Address that receives LP fees from graduated tokens</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.lpRecipientAddress}
                      onChange={(e) => setConfig({...config, lpRecipientAddress: e.target.value})}
                      placeholder="0x..."
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none font-mono text-sm"
                    />
                    <button
                      onClick={updateLpRecipientAddress}
                      disabled={isProcessing || !currentAccount}
                      className="px-4 py-2 bg-meme-purple rounded-lg font-semibold disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Graduated Tokens Tab */}
        {activeTab === 'graduated' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">🎓 Graduated Tokens (Pending Payout)</h2>
            <p className="text-gray-400 text-sm mb-6">
              These tokens have graduated but haven't had payouts distributed yet. Distribute to send creator payout + platform cut.
            </p>

            {graduatedTokens.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-gray-400">No tokens pending payout distribution</p>
              </div>
            ) : (
              <div className="space-y-4">
                {graduatedTokens.map((token: any) => (
                  <div key={token.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-lg">${token.ticker}</div>
                      <div className="text-sm text-gray-400">{token.name}</div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">
                        {token.id.slice(0, 20)}...
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Supply: {Number(token.curveSupply).toLocaleString()} | Balance: {(Number(token.curveBalance) / 1e9).toFixed(2)} SUI
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => distributePayout(token)}
                        disabled={isProcessing || !currentAccount}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                      >
                        💰 Distribute Payout
                      </button>
                      {token.cetusPoolAddress && (
                        <button
                          onClick={() => collectLpFees(token)}
                          disabled={isProcessing || !currentAccount}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                        >
                          💎 Collect LP Fees
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Special Launch Tab */}
        {activeTab === 'special' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">⭐ Special Launch Flag</h2>
              <p className="text-gray-400 text-sm mb-6">
                Enable special launch to mint all 54M tokens to treasury instead of burning them. This must be set BEFORE the token graduates and pools are created.
              </p>

              <div className="space-y-4">
                {/* Search/Select Token */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Search Token</label>
                  <input
                    type="text"
                    value={specialLaunchSearch}
                    onChange={(e) => {
                      setSpecialLaunchSearch(e.target.value);
                      setSelectedToken(null);
                    }}
                    placeholder="Search by ticker, name, or curve ID..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none"
                  />
                </div>

                {/* Search Results */}
                {specialLaunchSearch && filteredTokensForSpecial.length > 0 && !selectedToken && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 max-h-60 overflow-y-auto">
                    {filteredTokensForSpecial.map((token: any) => (
                      <button
                        key={token.id}
                        onClick={() => {
                          setSelectedToken(token);
                          setSpecialLaunchSearch('');
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <div className="font-bold">${token.ticker}</div>
                        <div className="text-sm text-gray-400">{token.name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-1">
                          {token.id.slice(0, 30)}...
                        </div>
                        {token.graduated && (
                          <div className="text-xs text-yellow-400 mt-1">⚠️ Already graduated</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Token Display */}
                {selectedToken && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-lg text-green-400">${selectedToken.ticker}</div>
                        <div className="text-sm text-gray-400">{selectedToken.name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-2">
                          Curve ID: {selectedToken.id}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Supply: {Number(selectedToken.curveSupply || 0).toLocaleString()}
                        </div>
                        {selectedToken.graduated && (
                          <div className="text-xs text-red-400 font-semibold mt-2">
                            ⚠️ Warning: Token has already graduated - special launch flag may not be changeable!
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedToken(null);
                          setSpecialLaunchSearch('');
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Enable/Disable Toggle */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4">
                  <input
                    type="checkbox"
                    id="specialLaunchEnabled"
                    checked={specialLaunchEnabled}
                    onChange={(e) => setSpecialLaunchEnabled(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <label htmlFor="specialLaunchEnabled" className="text-sm">
                    <strong>Enable Special Launch</strong> - Mint all 54M to treasury instead of burning
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  onClick={setSpecialLaunch}
                  disabled={isProcessing || !currentAccount || !selectedToken}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isProcessing ? '⏳ Processing...' : selectedToken ? `⚡ Set Special Launch for ${selectedToken.ticker}` : '⚡ Select a token first'}
                </button>
              </div>

              <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                  <strong>⚠️ Critical:</strong> This can only be called BEFORE pool creation. Once LP is seeded, this cannot be changed.
                </p>
              </div>
            </div>

            {/* All Tokens List for Reference */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">📋 All Tokens ({allTokens.length})</h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {allTokens.map((token: any) => (
                  <div
                    key={token.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedToken(token);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold">${token.ticker}</span>
                        <span className="text-sm text-gray-400 ml-2">{token.name}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        {token.graduated && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">🎓 Graduated</span>
                        )}
                        {token.cetusPoolAddress && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">💎 Pool Created</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
