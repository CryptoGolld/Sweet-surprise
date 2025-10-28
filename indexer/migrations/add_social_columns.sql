-- Add social media columns to tokens table
-- Run this migration on the Ubuntu server

ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS telegram TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Create indexes for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_twitter ON tokens(twitter) WHERE twitter IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_telegram ON tokens(telegram) WHERE telegram IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_website ON tokens(website) WHERE website IS NOT NULL;
