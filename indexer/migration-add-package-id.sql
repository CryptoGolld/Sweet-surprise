-- Add package_id column to tokens table
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS package_id VARCHAR(66);

-- Extract package_id from existing coin_type data
UPDATE tokens 
SET package_id = split_part(coin_type, '::', 1)
WHERE package_id IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_package_id ON tokens(package_id);

-- Show results
SELECT id, ticker, package_id, LEFT(coin_type, 80) as coin_type_preview FROM tokens LIMIT 10;
