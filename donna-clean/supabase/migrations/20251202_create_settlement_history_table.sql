-- Migration: Create settlement_history table to track all settlements
-- Date: 2025-12-02
--
-- This migration creates a dedicated table for settlement tracking.
-- Solves the issue where Advance settlements don't appear in Settlement History
-- because they don't create "Settlement of" entries like Credit settlements do.

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 1: Create settlement_history table
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS settlement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  settlement_entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,  -- NULL for Advance (no cash entry created)
  settlement_type TEXT NOT NULL,  -- 'credit' or 'advance'
  entry_type TEXT NOT NULL,  -- 'Credit' or 'Advance'
  category TEXT NOT NULL,  -- 'Sales', 'COGS', 'Opex', 'Assets'
  amount NUMERIC NOT NULL,
  settlement_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_settlement_type CHECK (settlement_type IN ('credit', 'advance')),
  CONSTRAINT valid_entry_type CHECK (entry_type IN ('Credit', 'Advance'))
);

COMMENT ON TABLE settlement_history IS 'Tracks all settlements (Credit and Advance). Credit settlements have settlement_entry_id (Cash IN/OUT), Advance settlements do not.';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Add indexes for performance
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_settlement_history_user
ON settlement_history(user_id);

CREATE INDEX IF NOT EXISTS idx_settlement_history_date
ON settlement_history(settlement_date DESC);

CREATE INDEX IF NOT EXISTS idx_settlement_history_original
ON settlement_history(original_entry_id);

CREATE INDEX IF NOT EXISTS idx_settlement_history_settlement_entry
ON settlement_history(settlement_entry_id) WHERE settlement_entry_id IS NOT NULL;

COMMENT ON INDEX idx_settlement_history_user IS 'Speeds up queries filtering by user';
COMMENT ON INDEX idx_settlement_history_date IS 'Speeds up queries sorting by settlement date';
COMMENT ON INDEX idx_settlement_history_original IS 'Speeds up lookups by original entry (for delete operations)';
COMMENT ON INDEX idx_settlement_history_settlement_entry IS 'Speeds up lookups by settlement entry (Cash IN/OUT for Credit)';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: Enable RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE settlement_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own settlement history
CREATE POLICY "Users can manage their own settlement history"
ON settlement_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can manage their own settlement history" ON settlement_history IS
'Ensures users can only view and manage their own settlement records';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: Migrate existing settlement data
-- ═══════════════════════════════════════════════════════════════════════

-- Backfill existing Credit settlements from Cash IN/OUT entries
INSERT INTO settlement_history (
  user_id,
  original_entry_id,
  settlement_entry_id,
  settlement_type,
  entry_type,
  category,
  amount,
  settlement_date,
  notes,
  created_at
)
SELECT
  e.user_id,
  -- Extract original entry ID from notes: "Settlement of Credit Sales (ID: uuid)"
  SUBSTRING(e.notes FROM '\(ID:\s*([a-f0-9-]{36})\)')::UUID as original_entry_id,
  e.id as settlement_entry_id,
  'credit' as settlement_type,
  -- Extract entry type from notes: "Settlement of Credit ..."
  CASE
    WHEN e.notes LIKE '%Credit%' THEN 'Credit'
    ELSE 'Credit'
  END as entry_type,
  e.category,
  e.amount,
  e.entry_date as settlement_date,
  e.notes,
  e.created_at
FROM entries e
WHERE e.notes LIKE 'Settlement of Credit%'
  AND e.entry_type IN ('Cash IN', 'Cash OUT')
  AND e.notes ~ '\(ID:\s*[a-f0-9-]{36}\)';  -- Only if has valid UUID

-- Note: Advance settlements can't be backfilled from existing data
-- because they don't create settlement entries. They will be tracked
-- going forward when new Advance settlements are created.

-- Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM settlement_history;
  RAISE NOTICE 'Migrated % existing Credit settlement records', migrated_count;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 5: Update settle_entry function to insert into settlement_history
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION settle_entry(
  p_entry_id UUID,
  p_user_id UUID,
  p_settlement_amount NUMERIC,
  p_settlement_date DATE
) RETURNS JSON AS $$
DECLARE
  v_entry RECORD;
  v_remaining_amount NUMERIC;
  v_next_remaining NUMERIC;
  v_is_fully_settled BOOLEAN;
  v_settlement_payment_method TEXT;
  v_new_entry_type TEXT;
  v_new_entry_id UUID;  -- Store the ID of the created cash entry
BEGIN
  -- 1. Load and lock the entry
  SELECT * INTO v_entry
  FROM entries
  WHERE id = p_entry_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Entry not found');
  END IF;

  -- 2. Validate entry type
  IF v_entry.entry_type NOT IN ('Credit', 'Advance') THEN
    RETURN json_build_object('success', false, 'error', 'Only Credit and Advance entries can be settled');
  END IF;

  -- 3. Validate amount
  v_remaining_amount := COALESCE(v_entry.remaining_amount, v_entry.amount);

  IF p_settlement_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Settlement amount must be greater than zero');
  END IF;

  IF p_settlement_amount > v_remaining_amount THEN
    RETURN json_build_object('success', false, 'error', 'Settlement amount exceeds remaining balance');
  END IF;

  -- 4. ✅ CRITICAL: ONLY create Cash entry for Credit, NEVER for Advance
  IF v_entry.entry_type = 'Credit' THEN
    v_settlement_payment_method := CASE
      WHEN v_entry.payment_method IN ('Cash', 'Bank') THEN v_entry.payment_method
      ELSE 'Cash'
    END;

    -- Determine correct entry type
    IF v_entry.category = 'Sales' THEN
      v_new_entry_type := 'Cash IN';
    ELSE
      v_new_entry_type := 'Cash OUT';
    END IF;

    -- Create the cash entry ONLY for Credit
    INSERT INTO entries (
      user_id,
      entry_type,
      category,
      payment_method,
      amount,
      remaining_amount,
      entry_date,
      notes,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      v_new_entry_type,
      v_entry.category,
      v_settlement_payment_method,
      p_settlement_amount,
      p_settlement_amount,
      p_settlement_date,
      'Settlement of ' || v_entry.entry_type || ' ' || v_entry.category || ' (ID: ' || v_entry.id || ')',
      NOW(),
      NOW()
    ) RETURNING id INTO v_new_entry_id;  -- Capture the ID

  ELSIF v_entry.entry_type = 'Advance' THEN
    -- No INSERT here! Cash was already counted when Advance was created
    v_new_entry_id := NULL;  -- No cash entry for Advance
    RAISE NOTICE 'Advance settlement: No Cash entry created (cash already counted)';
  END IF;

  -- 5. Update original entry (for both Credit and Advance)
  v_next_remaining := GREATEST(v_remaining_amount - p_settlement_amount, 0);
  v_is_fully_settled := (v_next_remaining <= 0);

  UPDATE entries
  SET
    remaining_amount = v_next_remaining,
    settled = v_is_fully_settled,
    settled_at = CASE WHEN v_is_fully_settled THEN p_settlement_date::TIMESTAMPTZ ELSE settled_at END,
    updated_at = NOW()
  WHERE id = p_entry_id AND user_id = p_user_id;

  -- 6. ✅ NEW: Insert into settlement_history table
  INSERT INTO settlement_history (
    user_id,
    original_entry_id,
    settlement_entry_id,
    settlement_type,
    entry_type,
    category,
    amount,
    settlement_date,
    notes,
    created_at
  ) VALUES (
    p_user_id,
    p_entry_id,
    v_new_entry_id,  -- NULL for Advance, UUID for Credit
    CASE WHEN v_entry.entry_type = 'Credit' THEN 'credit' ELSE 'advance' END,
    v_entry.entry_type,
    v_entry.category,
    p_settlement_amount,
    p_settlement_date,
    'Settlement of ' || v_entry.entry_type || ' ' || v_entry.category,
    NOW()
  );

  -- 7. Return success with details
  RETURN json_build_object(
    'success', true,
    'entry_type', v_entry.entry_type,
    'category', v_entry.category,
    'cash_entry_created', (v_entry.entry_type = 'Credit'),
    'cash_entry_type', CASE WHEN v_entry.entry_type = 'Credit' THEN v_new_entry_type ELSE NULL END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION settle_entry TO authenticated;

COMMENT ON FUNCTION settle_entry IS
'Settles Credit or Advance entries. For Credit: creates Cash IN/OUT entry. For Advance: only marks as settled (cash already counted). Both types create settlement_history record.';

-- ═══════════════════════════════════════════════════════════════════════
-- Verification queries (for testing)
-- ═══════════════════════════════════════════════════════════════════════

-- Count settlement records by type:
-- SELECT settlement_type, COUNT(*) as count
-- FROM settlement_history
-- GROUP BY settlement_type;
--
-- Expected: Shows count of 'credit' and 'advance' settlements

-- View recent settlements:
-- SELECT * FROM settlement_history
-- ORDER BY created_at DESC
-- LIMIT 10;
