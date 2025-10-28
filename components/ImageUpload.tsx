'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export function ImageUpload({ value, onChange, onUploadingChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notify parent when upload state changes
  const setUploadingWithNotify = (state: boolean) => {
    setUploading(state);
    onUploadingChange?.(state);
  };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Pinata
    setUploadingWithNotify(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      console.log('✅ IPFS upload successful, URL:', data.url);
      
      if (!data.url) {
        throw new Error('No URL returned from upload');
      }
      
      // Update state with the URL
      onChange(data.url);
      
      // Wait a tick to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      toast.success('Image uploaded to IPFS!', {
        description: 'Your image is ready',
        duration: 3000,
      });
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
      setPreview(value); // Revert preview
    } finally {
      setUploadingWithNotify(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold">
        Token Image {uploading && <span className="text-meme-purple">(Uploading to IPFS...)</span>}
      </label>
      
      {/* Preview */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="relative w-full aspect-square max-w-xs mx-auto bg-gradient-to-br from-meme-pink/20 to-sui-blue/20 rounded-2xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Click to upload</p>
            <p className="text-xs mt-1">PNG, JPG, GIF (max 10MB)</p>
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-meme-purple border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Manual URL input (optional fallback) */}
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-400 hover:text-white">
          Or paste image URL manually
        </summary>
        <input
          type="url"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setPreview(e.target.value);
          }}
          placeholder="https://..."
          className="w-full mt-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-meme-purple outline-none transition-colors text-sm"
        />
      </details>

      <p className="text-xs text-gray-400">
        💡 Images are uploaded to IPFS for permanent, decentralized storage
      </p>
    </div>
  );
}
