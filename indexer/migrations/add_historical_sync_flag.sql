-- Add historical_sync_complete flag to indexer_state table
-- This prevents re-indexing historical events on every restart

ALTER TABLE indexer_state 
ADD COLUMN IF NOT EXISTS historical_sync_complete BOOLEAN DEFAULT FALSE;

-- Reset to FALSE so it runs once after this migration
UPDATE indexer_state SET historical_sync_complete = FALSE WHERE id = 1;
