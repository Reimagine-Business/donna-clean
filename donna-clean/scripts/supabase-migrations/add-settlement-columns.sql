-- Add missing columns to entries table
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS remaining_amount numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS settled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS settled_at timestamp DEFAULT NULL;

-- Backfill for existing Credit/Advance entries
UPDATE entries
SET remaining_amount = amount
WHERE entry_type IN ('Credit', 'Advance') AND remaining_amount IS NULL;
