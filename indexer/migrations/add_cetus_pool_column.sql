-- Migration: Add cetus_pool_address column to tokens table
-- Date: 2025-10-28

-- Add cetus_pool_address column
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS cetus_pool_address TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tokens_cetus_pool ON tokens(cetus_pool_address);

-- Create index for graduated tokens
CREATE INDEX IF NOT EXISTS idx_tokens_graduated ON tokens(graduated);
