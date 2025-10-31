-- Add pool status tracking for graduated tokens
-- This helps manage the gap between graduation and manual pool creation

-- Add pool_status column
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS pool_status VARCHAR(20) DEFAULT 'active';

-- Add graduated_at timestamp
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS graduated_at TIMESTAMP;

-- Update existing graduated tokens
UPDATE tokens 
SET pool_status = CASE 
  WHEN graduated = true AND cetus_pool_address IS NOT NULL THEN 'graduated_with_pool'
  WHEN graduated = true AND cetus_pool_address IS NULL THEN 'graduated_pending_pool'
  ELSE 'active'
END
WHERE pool_status = 'active';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pool_status ON tokens(pool_status);
CREATE INDEX IF NOT EXISTS idx_graduated_at ON tokens(graduated_at);

-- Show results
SELECT 
  ticker,
  graduated,
  pool_status,
  cetus_pool_address IS NOT NULL as has_pool,
  graduated_at
FROM tokens 
WHERE graduated = true
ORDER BY graduated_at DESC NULLS LAST
LIMIT 10;

SELECT 
  pool_status,
  COUNT(*) as count
FROM tokens
GROUP BY pool_status;
