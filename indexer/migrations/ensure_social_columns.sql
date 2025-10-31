-- Ensure social columns exist in tokens table
-- Run this if you get errors about missing columns

-- Add twitter column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tokens' AND column_name='twitter'
  ) THEN 
    ALTER TABLE tokens ADD COLUMN twitter TEXT;
  END IF;
END $$;

-- Add telegram column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tokens' AND column_name='telegram'
  ) THEN 
    ALTER TABLE tokens ADD COLUMN telegram TEXT;
  END IF;
END $$;

-- Add website column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tokens' AND column_name='website'
  ) THEN 
    ALTER TABLE tokens ADD COLUMN website TEXT;
  END IF;
END $$;

-- Add cetus_pool_address column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tokens' AND column_name='cetus_pool_address'
  ) THEN 
    ALTER TABLE tokens ADD COLUMN cetus_pool_address TEXT;
  END IF;
END $$;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tokens' 
AND column_name IN ('twitter', 'telegram', 'website', 'cetus_pool_address')
ORDER BY column_name;
