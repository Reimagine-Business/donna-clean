-- Migration: Add remaining_amount column to entries table
-- Date: 2025-12-03
--
-- CRITICAL FIX: This column is required for partial settlement tracking
-- but was never created in previous migrations. The stored procedures already
-- use this column, so adding it now will fix the partial settlement display bug.

-- ═══════════════════════════════════════════════════════════════════════
-- Add remaining_amount column
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE entries
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC;

COMMENT ON COLUMN entries.remaining_amount IS 'Tracks remaining balance after partial settlements. NULL means same as amount (no settlements yet).';

-- ═══════════════════════════════════════════════════════════════════════
-- Backfill existing entries
-- ═══════════════════════════════════════════════════════════════════════

-- For all existing entries where remaining_amount is NULL:
-- - If settled = false: remaining_amount = amount (nothing paid yet)
-- - If settled = true: remaining_amount = 0 (fully paid)

UPDATE entries
SET remaining_amount = CASE
  WHEN settled = true THEN 0
  ELSE amount
END
WHERE remaining_amount IS NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- Create index for performance
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_entries_remaining_amount
ON entries(user_id, remaining_amount)
WHERE remaining_amount > 0 AND settled = false;

COMMENT ON INDEX idx_entries_remaining_amount IS 'Speeds up queries for pending entries with remaining balances';

-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK (if needed)
-- ═══════════════════════════════════════════════════════════════════════

-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_entries_remaining_amount;
-- ALTER TABLE entries DROP COLUMN IF EXISTS remaining_amount;
