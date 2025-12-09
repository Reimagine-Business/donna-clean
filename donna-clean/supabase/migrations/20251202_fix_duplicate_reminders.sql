-- Migration: Fix duplicate reminders and prevent future duplicates
-- Date: 2025-12-02
--
-- This migration:
-- 1. Cleans up existing duplicate reminders (keeps oldest for each user/title/due_date)
-- 2. Adds unique constraint to prevent future duplicates
-- 3. Adds database indexes for better query performance

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 1: Clean up existing duplicates
-- ═══════════════════════════════════════════════════════════════════════

-- Delete duplicate pending reminders, keeping only the oldest one
-- This handles cases like multiple "Rent" entries with same due date
DELETE FROM reminders a
USING (
  SELECT
    user_id,
    title,
    due_date,
    MIN(created_at) as first_created
  FROM reminders
  WHERE status = 'pending'
  GROUP BY user_id, title, due_date
  HAVING COUNT(*) > 1
) b
WHERE a.user_id = b.user_id
  AND a.title = b.title
  AND a.due_date = b.due_date
  AND a.status = 'pending'
  AND a.created_at > b.first_created;

-- Log how many duplicates were removed
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate reminders', deleted_count;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Add unique constraint to prevent future duplicates
-- ═══════════════════════════════════════════════════════════════════════

-- Create partial unique index for pending reminders only
-- This prevents creating duplicate pending reminders with same user/title/due_date
-- Completed reminders are not affected (can have duplicates in history)
CREATE UNIQUE INDEX IF NOT EXISTS reminders_unique_pending
ON reminders (user_id, title, due_date)
WHERE status = 'pending';

COMMENT ON INDEX reminders_unique_pending IS
'Prevents duplicate pending reminders with same user, title, and due date. Completed reminders are not affected.';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: Add performance indexes
-- ═══════════════════════════════════════════════════════════════════════

-- Speed up queries filtering by user and status
CREATE INDEX IF NOT EXISTS idx_reminders_user_status
ON reminders(user_id, status);

-- Speed up queries sorting by due date
CREATE INDEX IF NOT EXISTS idx_reminders_due_date
ON reminders(due_date) WHERE status = 'pending';

-- Speed up recurring reminder lookups
CREATE INDEX IF NOT EXISTS idx_reminders_parent
ON reminders(parent_reminder_id) WHERE parent_reminder_id IS NOT NULL;

COMMENT ON INDEX idx_reminders_user_status IS 'Speeds up queries filtering by user and status';
COMMENT ON INDEX idx_reminders_due_date IS 'Speeds up queries sorting pending reminders by due date';
COMMENT ON INDEX idx_reminders_parent IS 'Speeds up lookups for recurring reminders';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: Verification query (for testing)
-- ═══════════════════════════════════════════════════════════════════════

-- Run this to verify no duplicates remain:
-- SELECT user_id, title, due_date, status, COUNT(*) as count
-- FROM reminders
-- WHERE status = 'pending'
-- GROUP BY user_id, title, due_date, status
-- HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)
