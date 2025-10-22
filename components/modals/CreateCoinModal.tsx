'use client';

import { useState, FormEvent } from 'react';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { createCoinTransaction } from '@/lib/sui/transactions';
import { toast } from 'sonner';
import { getExplorerLink } from '@/lib/sui/client';

interface CreateCoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCoinModal({ isOpen, onClose }: CreateCoinModalProps) {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  
  const [formData, setFormData] = useState({
    ticker: '',
    name: '',
    description: '',
    imageUrl: '',
    twitter: '',
    telegram: '',
    website: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (!validateForm()) {
      toast.error('Please fix form errors');
      return;
    }

    try {
      const socials = [
        formData.twitter,
        formData.telegram,
        formData.website,
      ].filter(Boolean);
      
      const tx = createCoinTransaction({
        ticker: formData.ticker.toUpperCase(),
        name: formData.name,
        description: formData.description,
        imageUrl: formData.imageUrl,
        socials,
      });

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            toast.success('Coin created successfully!', {
              description: 'View on explorer',
              action: {
                label: 'View',
                onClick: () => window.open(getExplorerLink(result.digest, 'txblock'), '_blank'),
              },
            });
            
            // Reset form
            setFormData({
              ticker: '',
              name: '',
              description: '',
              imageUrl: '',
              twitter: '',
              telegram: '',
              website: '',
            });
            
            onClose();
            
            // Reload after a delay to show new coin
            setTimeout(() => window.location.reload(), 2000);
          },
          onError: (error) => {
            console.error('Failed to create coin:', error);
            toast.error('Failed to create coin', {
              description: error.message || 'Please try again',
            });
          },
        }
      );
    } catch (error: any) {
      toast.error('Failed to build transaction', {
        description: error.message,
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-sui-dark border-2 border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-sui-dark border-b border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gradient">🚀 Create Your Memecoin</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
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
            {errors.description && (
              <p className="text-red-400 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-semibold mb-2">Image URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">Direct link to your coin's image</p>
          </div>

          {/* Socials (Optional) */}
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

          {/* Info box */}
          <div className="bg-sui-blue/10 border border-sui-blue/30 rounded-lg p-4 space-y-2 text-sm">
            <p className="font-semibold text-sui-blue">ℹ️ How it works:</p>
            <ul className="space-y-1 text-gray-300 list-disc list-inside">
              <li>Fair launch with bonding curve pricing</li>
              <li>737M tokens available for trading</li>
              <li>Graduates at 13K SUI collected</li>
              <li>Auto-creates Cetus liquidity pool</li>
              <li>No presales, no team allocation on curve</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-6 py-3 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !currentAccount}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {isPending ? '🚀 Creating...' : '🚀 Create Coin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
