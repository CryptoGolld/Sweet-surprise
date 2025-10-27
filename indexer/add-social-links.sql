-- Add social links columns to tokens table
ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS telegram TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tokens_twitter ON tokens(twitter) WHERE twitter IS NOT NULL;
