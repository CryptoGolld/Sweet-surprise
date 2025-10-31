'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { createCoinTransaction, createCurveTransaction } from '@/lib/sui/transactions';
import { toast } from 'sonner';
import { getExplorerLink } from '@/lib/sui/client';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { ImageUpload } from '@/components/ImageUpload';
import { COIN_TYPES } from '@/lib/constants';

interface CreateCoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCoinModal({ isOpen, onClose }: CreateCoinModalProps) {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  
  // UI State
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, or 3
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    ticker: '',
    name: '',
    description: '',
    imageUrl: '',
    twitter: '',
    telegram: '',
    website: '',
    initialBuyAmount: '', // Optional: Amount to buy immediately after launch
  });
  
  // Published Package Data (from step 1)
  const [publishedData, setPublishedData] = useState<{
    packageId: string;
    moduleName: string;
    structName: string;
    treasuryCapId: string;
    metadataId: string;
    publishDigest: string;
  } | null>(null);
  
  // Bonding Curve Data (from step 2)
  const [curveData, setCurveData] = useState<{
    curveId: string;
    curveDigest: string;
    coinType: string;
  } | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Persist state to localStorage to survive page reloads
  useEffect(() => {
    if (isOpen && currentAccount) {
      const savedState = localStorage.getItem(`createCoin_${currentAccount.address}`);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (parsed.formData) setFormData(parsed.formData);
          if (parsed.publishedData) setPublishedData(parsed.publishedData);
          if (parsed.curveData) setCurveData(parsed.curveData);
          if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        } catch (e) {
          console.warn('Failed to restore state:', e);
        }
      }
    }
  }, [isOpen, currentAccount]);

  // Save state whenever it changes
  useEffect(() => {
    if (isOpen && currentAccount && (publishedData || curveData)) {
      const state = {
        formData,
        publishedData,
        curveData,
        currentStep,
      };
      localStorage.setItem(`createCoin_${currentAccount.address}`, JSON.stringify(state));
    }
  }, [isOpen, currentAccount, formData, publishedData, curveData, currentStep]);

  // Debug: Log formData changes (especially imageUrl)
  useEffect(() => {
    if (isOpen && formData.imageUrl) {
      console.log('📋 formData.imageUrl updated:', formData.imageUrl);
    }
  }, [formData.imageUrl, isOpen]);

  if (!isOpen) return null;

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};
    
    if (!formData.ticker) {
      newErrors.ticker = 'Ticker is required';
    } else if (formData.ticker.length > 10) {
      newErrors.ticker = 'Ticker must be 10 characters or less';
    }
    
    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }
    
    if (!formData.imageUrl) {
      newErrors.imageUrl = 'Token image is required';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Step 1: Create Coin (Publish Package)
  async function handleStep1(e: FormEvent) {
    e.preventDefault();
    
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (!validateForm()) {
      toast.error('Please fix form errors');
      return;
    }

    // Check if image is still uploading
    if (isImageUploading) {
      toast.error('Please wait for image upload to complete');
      return;
    }

    // Log imageUrl for debugging
    console.log('🎨 Creating coin with imageUrl:', formData.imageUrl || '(empty)');
    console.log('🎨 Full formData:', JSON.stringify(formData, null, 2));
    
    if (!formData.imageUrl) {
      console.warn('⚠️  No image URL provided - coin will be created without an icon');
      toast.warning('No image uploaded', {
        description: 'Your coin will be created without an icon. You can continue, but adding an image is recommended.',
        duration: 5000,
      });
    }

    setIsProcessing(true);
    
    try {
      // Compile on backend
      setStatus('Compiling package...');
      const { transaction: publishTx, moduleName, structName } = await createCoinTransaction({
        ticker: formData.ticker.toUpperCase(),
        name: formData.name,
        description: formData.description,
        imageUrl: formData.imageUrl,
        senderAddress: currentAccount.address,
      });
      
      // User signs to publish
      setStatus('Please sign to create coin...');
      const publishResult = await signAndExecute({
        transaction: publishTx,
      });
      
      const digest = publishResult.digest;
      if (!digest) {
        throw new Error('Package publish failed - no digest returned');
      }
      
      // Wait for indexing
      setStatus('Package created! Waiting for confirmation...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Fetch transaction details
      const client = new SuiClient({ url: getFullnodeUrl('testnet') });
      const txDetails = await client.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      
      if (txDetails.effects?.status?.status !== 'success') {
        throw new Error('Package publish failed');
      }
      
      // Extract package ID and objects
      const publishedObj = txDetails.objectChanges?.find(
        (obj: any) => obj.type === 'published'
      );
      const treasuryCapObj = txDetails.objectChanges?.find(
        (obj: any) => obj.type === 'created' && obj.objectType?.includes('TreasuryCap')
      );
      const metadataObj = txDetails.objectChanges?.find(
        (obj: any) => obj.type === 'created' && obj.objectType?.includes('CoinMetadata')
      );
      
      if (!publishedObj || !treasuryCapObj || !metadataObj) {
        throw new Error('Failed to find published objects');
      }
      
      const packageId = (publishedObj as any).packageId;
      const treasuryCapId = (treasuryCapObj as any).objectId;
      const metadataId = (metadataObj as any).objectId;
      
      // Save data and move to step 2
      setPublishedData({
        packageId,
        moduleName,
        structName,
        treasuryCapId,
        metadataId,
        publishDigest: digest,
      });
      
      setCurrentStep(2);
      setStatus('');
      
      toast.success('✅ Step 1 Complete!', {
        description: formData.initialBuyAmount ? 'Next: Launch and buy tokens together!' : 'Coin package created. Now publish to bonding curve.',
        duration: 4000,
      });
      
    } catch (error: any) {
      toast.error('Failed to create coin', {
        description: error.message || 'Please try again',
        duration: 6000,
      });
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  }

  // Step 2: Publish (Create Bonding Curve) + Optional immediate buy
  async function handleStep2(e: FormEvent) {
    e.preventDefault();
    
    if (!publishedData || !currentAccount) {
      toast.error('Missing package data. Please restart.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Check if user wants to buy immediately
      const shouldBuyImmediately = formData.initialBuyAmount && parseFloat(formData.initialBuyAmount) > 0;
      
      if (shouldBuyImmediately) {
        // COMBINED: Create curve + buy in one transaction (faster!)
        setStatus('Creating curve and buying tokens...');
        
        const buyAmountMist = Math.floor(parseFloat(formData.initialBuyAmount!) * 1_000_000_000).toString();
        const minTokensOut = '1'; // Accept any amount (user buying at launch price)
        
        // Get user's payment coins
        const client = new SuiClient({ url: getFullnodeUrl('testnet') });
        const coins = await client.getCoins({
          owner: currentAccount.address,
          coinType: COIN_TYPES.PAYMENT_TOKEN,
        });
        
        if (coins.data.length === 0) {
          throw new Error('No payment tokens found. Get some from the faucet!');
        }
        
        const { createCurveAndBuyTransaction } = await import('@/lib/sui/combined-transactions');
        
        const combinedTx = createCurveAndBuyTransaction({
          packageId: publishedData.packageId,
          moduleName: publishedData.moduleName,
          structName: publishedData.structName,
          treasuryCapId: publishedData.treasuryCapId,
          metadataId: publishedData.metadataId,
          paymentCoinIds: coins.data.map(c => c.coinObjectId),
          maxSuiIn: buyAmountMist,
          minTokensOut: minTokensOut,
          referrerAddress: undefined,
        });
        
        setStatus('Please sign to create and buy...');
        const result = await signAndExecute({
          transaction: combinedTx,
        });
        
        if (!result.digest) {
          throw new Error('Transaction failed - no digest returned');
        }
        
        // Wait for transaction to be indexed
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Get the curve ID from transaction
        const txDetails = await client.getTransactionBlock({
          digest: result.digest,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        });
        
        const curveObj = txDetails.objectChanges?.find(
          (obj: any) => obj.type === 'created' && obj.objectType?.includes('BondingCurve')
        );
        
        if (!curveObj) {
          throw new Error('Failed to find bonding curve object');
        }
        
        const curveId = (curveObj as any).objectId;
        
        // Skip step 3 (already bought)
        setCurveId(curveId);
        onSuccess?.(curveId);
        onOpenChange(false);
        
        toast.success('🎉 Token Launched!', {
          description: `You bought ${formData.initialBuyAmount} tokens at launch. Head start achieved!`,
          duration: 5000,
        });
        
        return;
      }
      
      // NORMAL PATH: Just create curve (no immediate buy)
      setStatus('Creating bonding curve...');
      const curveTx = createCurveTransaction({
        packageId: publishedData.packageId,
        moduleName: publishedData.moduleName,
        structName: publishedData.structName,
        treasuryCapId: publishedData.treasuryCapId,
        metadataId: publishedData.metadataId,
      });
      
      setStatus('Please sign to publish...');
      const curveResult = await signAndExecute({
        transaction: curveTx,
      });
      
      if (!curveResult.digest) {
        throw new Error('Curve creation failed - no digest returned');
      }
      
      // Wait for curve creation to be indexed
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get the curve ID from transaction
      const client = new SuiClient({ url: getFullnodeUrl('testnet') });
      const curveDetails = await client.getTransactionBlock({
        digest: curveResult.digest,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      
      // Find the created BondingCurve object
      const curveObj = curveDetails.objectChanges?.find(
        (obj: any) => obj.type === 'created' && obj.objectType?.includes('BondingCurve')
      );
      
      if (!curveObj) {
        throw new Error('Failed to find bonding curve object');
      }
      
      const curveId = (curveObj as any).objectId;
      
      // Construct coin type
      const coinType = `${publishedData.packageId}::${publishedData.moduleName}::${publishedData.structName}`;
      
      // Save curve data and move to step 3 (optional initial buy)
      setCurveData({
        curveId,
        curveDigest: curveResult.digest,
        coinType,
      });
      
      // Submit metadata (image, socials) to indexer
      if (formData.imageUrl || formData.twitter || formData.telegram || formData.website) {
        try {
          await fetch('/api/update-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coinType,
              imageUrl: formData.imageUrl,
              twitter: formData.twitter,
              telegram: formData.telegram,
              website: formData.website,
            }),
          });
        } catch (e) {
          console.warn('Failed to submit metadata:', e);
        }
      }
      
      setCurrentStep(3);
      setStatus('');
      
      toast.success('✅ Step 2 Complete!', {
        description: 'Coin published! Optionally buy initial tokens now.',
        duration: 4000,
      });
      
    } catch (error: any) {
      toast.error('Failed to publish', {
        description: error.message || 'Please try again',
        duration: 6000,
      });
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  }

  // Step 3: Initial Buy (Optional)
  async function handleStep3(e: FormEvent) {
    e.preventDefault();
    
    if (!publishedData || !curveData) {
      toast.error('Missing data. Please restart.');
      return;
    }
    
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    
    try {
      const { getFullnodeUrl, SuiClient } = await import('@mysten/sui/client');
      const { buyTokensTransaction } = await import('@/lib/sui/transactions');
      const { COIN_TYPES } = await import('@/lib/constants');
      
      setStatus('Finding your SUILFG_MEMEFI coins...');
      
      // Wait a bit longer for indexing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get user's SUILFG_MEMEFI coins
      const client = new SuiClient({ url: getFullnodeUrl('testnet') });
      const coins = await client.getCoins({
        owner: currentAccount!.address,
        coinType: COIN_TYPES.SUILFG_MEMEFI,
      });
      
      if (!coins.data || coins.data.length === 0) {
        throw new Error(`No SUILFG_MEMEFI tokens found. You have ${coins.data?.length || 0} coin objects. Please claim from faucet first.`);
      }
      
      // Use all coins
      const amountInMist = BigInt(Math.floor(parseFloat(buyAmount) * 1_000_000_000));
      
      setStatus('Creating buy transaction...');
      const buyTx = buyTokensTransaction({
        curveId: curveData.curveId,
        coinType: curveData.coinType,
        paymentCoinIds: coins.data.map(c => c.coinObjectId),
        maxSuiIn: amountInMist.toString(),
        minTokensOut: '0', // Accept any amount (user accepts slippage)
      });
      
      setStatus('Please sign to buy...');
      const buyResult = await signAndExecute({
        transaction: buyTx,
      });
      
      if (!buyResult.digest) {
        throw new Error('Buy failed - no digest returned');
      }
      
      // Success!
      toast.success('🎉 Initial purchase complete!', {
        description: `Successfully bought ${formData.ticker} tokens`,
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerLink(buyResult.digest, 'txblock'), '_blank'),
        },
        duration: 8000,
      });
      
      // Reset and close
      handleFinish();
      
    } catch (error: any) {
      toast.error('Failed to buy tokens', {
        description: error.message || 'You can still buy later from the tokens page',
        duration: 6000,
      });
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  }
  
  function handleSkipBuy() {
    toast.success('🎉 Coin launched successfully!', {
      description: `${formData.ticker} is now live on SuiLFG MemeFi`,
      duration: 6000,
    });
    handleFinish();
  }
  
  function handleFinish() {
    // Clear localStorage
    if (currentAccount) {
      localStorage.removeItem(`createCoin_${currentAccount.address}`);
    }
    
    setFormData({
      ticker: '',
      name: '',
      description: '',
      imageUrl: '',
      twitter: '',
      telegram: '',
      website: '',
    });
    setPublishedData(null);
    setCurveData(null);
    setBuyAmount('');
    setCurrentStep(1);
    setStatus('');
    onClose();
    
    // Navigate to the new token page instead of reloading
    if (curveData?.curveId) {
      router.push(`/tokens/${curveData.curveId}`);
    } else {
      // Fallback: go to tokens list
      router.push('/tokens');
    }
  }

  function handleClose() {
    if (!isProcessing) {
      // Don't clear state if we're in the middle of creation (step 2 or 3)
      if (currentStep > 1) {
        const shouldClose = confirm('You have an in-progress coin creation. Are you sure you want to close? Your progress will be saved.');
        if (!shouldClose) return;
      }
      
      // Only clear localStorage if we're closing from step 1
      if (currentStep === 1 && currentAccount) {
        localStorage.removeItem(`createCoin_${currentAccount.address}`);
      }
      
      if (currentStep === 1) {
        setCurrentStep(1);
        setPublishedData(null);
        setCurveData(null);
        setBuyAmount('');
        setStatus('');
        setFormData({
          ticker: '',
          name: '',
          description: '',
          imageUrl: '',
          twitter: '',
          telegram: '',
          website: '',
        });
      }
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
      <div className="bg-sui-dark border-2 border-white/20 rounded-2xl max-w-2xl w-full my-8 mx-auto animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-sui-dark border-b border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gradient">🚀 Launch Your Memecoin</h2>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="text-gray-400 hover:text-white text-2xl transition-colors disabled:opacity-50"
            >
              ×
            </button>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                currentStep === 1 
                  ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white' 
                  : publishedData 
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-gray-400'
              }`}>
                {publishedData ? '✓' : '1'}
              </div>
              <span className={`text-sm ${currentStep === 1 ? 'font-semibold' : 'text-gray-400'}`}>
                Create
              </span>
            </div>
            
            <div className="flex-1 h-px bg-white/20"></div>
            
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                currentStep === 2 
                  ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white' 
                  : curveData
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-gray-400'
              }`}>
                {curveData ? '✓' : '2'}
              </div>
              <span className={`text-sm ${currentStep === 2 ? 'font-semibold' : 'text-gray-400'}`}>
                Publish
              </span>
            </div>
            
            <div className="flex-1 h-px bg-white/20"></div>
            
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                currentStep === 3 
                  ? 'bg-gradient-to-r from-meme-pink to-meme-purple text-white' 
                  : 'bg-white/10 text-gray-400'
              }`}>
                3
              </div>
              <span className={`text-sm ${currentStep === 3 ? 'font-semibold' : 'text-gray-400'}`}>
                Buy (Optional)
              </span>
            </div>
          </div>
        </div>

        {/* Step 1: Create Coin */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1} className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Ticker */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Ticker Symbol <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="PEPE"
                maxLength={10}
                value={formData.ticker}
                onChange={(e) => {
                  // Auto-trim spaces and convert to uppercase
                  const trimmedValue = e.target.value.trim().toUpperCase();
                  setFormData({ ...formData, ticker: trimmedValue });
                }}
                onBlur={(e) => {
                  // Extra trim on blur to catch any trailing spaces
                  const trimmedValue = e.target.value.trim().toUpperCase();
                  setFormData({ ...formData, ticker: trimmedValue });
                }}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors"
              />
              {errors.ticker && (
                <p className="text-red-400 text-sm mt-1">{errors.ticker}</p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Pepe Coin"
                maxLength={50}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors"
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <textarea
                placeholder="Tell us about your memecoin..."
                maxLength={500}
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none resize-none transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Image Upload */}
            <ImageUpload
              value={formData.imageUrl}
              onChange={(url) => {
                console.log('📸 ImageUpload onChange called with URL:', url);
                setFormData(prev => {
                  const updated = { ...prev, imageUrl: url };
                  console.log('📸 Updated formData:', updated);
                  return updated;
                });
              }}
              onUploadingChange={setIsImageUploading}
            />
            {errors.imageUrl && (
              <p className="text-red-400 text-sm -mt-3">{errors.imageUrl}</p>
            )}

            {/* Socials */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold">Social Links (Optional)</label>
              
              <input
                type="text"
                placeholder="Twitter username or URL"
                value={formData.twitter}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors"
              />
              
              <input
                type="text"
                placeholder="Telegram username or URL"
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors"
              />
              
              <input
                type="url"
                placeholder="Website URL"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors"
              />
            </div>

            {/* Buy on Launch */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold">💰 Buy on Launch (Optional)</label>
              
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Amount to buy immediately (0 = skip)"
                value={formData.initialBuyAmount}
                onChange={(e) => setFormData({ ...formData, initialBuyAmount: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors"
              />
              <p className="text-xs text-white/50">
                💡 Combine steps 2+3 into one transaction for first-mover advantage!
              </p>
            </div>

            {/* Info box */}
            <div className="bg-sui-blue/10 border border-sui-blue/30 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-sui-blue">ℹ️ Step 1: Create Coin Package</p>
              <ul className="space-y-1 text-gray-300 list-disc list-inside">
                <li>Compiles your coin smart contract</li>
                <li>Publishes package to Sui blockchain</li>
                <li>Cost: ~0.1 SUI for gas</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="flex-1 px-6 py-3 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || !currentAccount || isImageUploading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {isImageUploading ? '⏳ Uploading image...' : isProcessing ? (status || '⏳ Processing...') : '🚀 Create Coin'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Publish */}
        {currentStep === 2 && publishedData && (
          <form onSubmit={handleStep2} className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Success Info */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
              <p className="font-semibold text-green-400">✅ Coin Package Created!</p>
              <div className="text-sm space-y-1 text-gray-300">
                <p><span className="text-gray-400">Ticker:</span> {formData.ticker}</p>
                <p><span className="text-gray-400">Name:</span> {formData.name}</p>
                <p className="text-xs text-gray-400 break-all">
                  Package: {publishedData.packageId.slice(0, 20)}...
                </p>
              </div>
              <a
                href={getExplorerLink(publishedData.publishDigest, 'txblock')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sui-blue hover:underline"
              >
                View on Explorer →
              </a>
            </div>

            {/* Info box */}
            <div className="bg-sui-blue/10 border border-sui-blue/30 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-sui-blue">ℹ️ Step 2: Publish to Bonding Curve</p>
              <ul className="space-y-1 text-gray-300 list-disc list-inside">
                <li>Creates bonding curve for trading</li>
                <li>737M tokens available for fair launch</li>
                <li>Graduates at 13K SUI collected</li>
                <li>Cost: ~0.1 SUI for gas</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={isProcessing}
                className="flex-1 px-6 py-3 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={isProcessing || !currentAccount}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {isProcessing ? (status || '⏳ Publishing...') : '📢 Publish to Curve'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Initial Buy (Optional) */}
        {currentStep === 3 && publishedData && curveData && (
          <form onSubmit={handleStep3} className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Success Info */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
              <p className="font-semibold text-green-400">🎉 Coin Published Successfully!</p>
              <div className="text-sm space-y-1 text-gray-300">
                <p><span className="text-gray-400">Ticker:</span> {formData.ticker}</p>
                <p><span className="text-gray-400">Name:</span> {formData.name}</p>
                <p className="text-xs text-gray-400 break-all">
                  Curve: {curveData.curveId.slice(0, 20)}...
                </p>
              </div>
              <a
                href={getExplorerLink(curveData.curveDigest, 'txblock')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sui-blue hover:underline"
              >
                View on Explorer →
              </a>
            </div>

            {/* Buy Form */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4">💰 Buy Initial Tokens (Optional)</h3>
              <p className="text-sm text-gray-400 mb-4">
                Support your coin with an initial purchase
              </p>
              
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Amount (SUILFG_MEMEFI)
                </label>
                <input
                  type="number"
                  placeholder="100"
                  step="0.1"
                  min="0"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-2">
                  You'll receive tokens based on the bonding curve price
                </p>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-sui-blue/10 border border-sui-blue/30 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-sui-blue">ℹ️ Optional Step</p>
              <ul className="space-y-1 text-gray-300 list-disc list-inside">
                <li>Show confidence in your coin with an initial buy</li>
                <li>You can always buy later from the tokens page</li>
                <li>Gas cost: ~0.1 SUI</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={handleSkipBuy}
                disabled={isProcessing}
                className="flex-1 px-6 py-3 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Skip → Finish
              </button>
              <button
                type="submit"
                disabled={isProcessing || !currentAccount || !buyAmount}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {isProcessing ? (status || '⏳ Buying...') : '💰 Buy & Finish'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
