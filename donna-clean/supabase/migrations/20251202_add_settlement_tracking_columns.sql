-- Migration: Add settlement tracking columns to entries table
-- Date: 2025-12-02
--
-- This migration adds columns to track settlement entries directly in the entries table.
-- This is a simpler approach than using a separate settlement_history table.
--
-- For Credit settlements:
--   - Creates a Cash IN/OUT entry with is_settlement=true, settlement_type='credit'
-- For Advance settlements:
--   - Creates a tracking entry with is_settlement=true, settlement_type='advance'
--
-- Both types of settlements are now visible in Settlement History by filtering
-- where is_settlement = true.

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 1: Add settlement tracking columns to entries table
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE entries
ADD COLUMN IF NOT EXISTS is_settlement BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS settlement_type TEXT CHECK (settlement_type IN ('credit', 'advance') OR settlement_type IS NULL),
ADD COLUMN IF NOT EXISTS original_entry_id UUID REFERENCES entries(id) ON DELETE CASCADE;

COMMENT ON COLUMN entries.is_settlement IS 'Marks entries that are settlement tracking records';
COMMENT ON COLUMN entries.settlement_type IS 'Type of settlement: credit or advance';
COMMENT ON COLUMN entries.original_entry_id IS 'References the original Credit/Advance entry that was settled';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Create indexes for performance
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_entries_is_settlement
ON entries(user_id, is_settlement)
WHERE is_settlement = true;

CREATE INDEX IF NOT EXISTS idx_entries_original_entry
ON entries(original_entry_id)
WHERE original_entry_id IS NOT NULL;

COMMENT ON INDEX idx_entries_is_settlement IS 'Speeds up Settlement History queries';
COMMENT ON INDEX idx_entries_original_entry IS 'Speeds up lookups by original entry (for delete operations)';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: Backfill existing Credit settlement entries
-- ═══════════════════════════════════════════════════════════════════════

-- Mark existing "Settlement of Credit..." entries as settlement tracking records
UPDATE entries
SET
  is_settlement = true,
  settlement_type = 'credit',
  original_entry_id = SUBSTRING(notes FROM '\(ID:\s*([a-f0-9-]{36})\)')::UUID
WHERE notes LIKE 'Settlement of Credit%'
  AND entry_type IN ('Cash IN', 'Cash OUT')
  AND notes ~ '\(ID:\s*[a-f0-9-]{36}\)';  -- Only if has valid UUID

-- Log backfill results
DO $$
DECLARE
  backfilled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfilled_count
  FROM entries
  WHERE is_settlement = true;
  RAISE NOTICE 'Backfilled % existing Credit settlement records', backfilled_count;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: Update settle_entry function to create tracking entries
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
  v_new_entry_id UUID;
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

  -- 4. Create settlement tracking entry based on type
  IF v_entry.entry_type = 'Credit' THEN
    -- For Credit: Create Cash IN/OUT entry (actual money movement)
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

    -- Create the cash entry for Credit
    INSERT INTO entries (
      user_id,
      entry_type,
      category,
      payment_method,
      amount,
      remaining_amount,
      entry_date,
      notes,
      is_settlement,
      settlement_type,
      original_entry_id,
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
      true,  -- is_settlement
      'credit',  -- settlement_type
      v_entry.id,  -- original_entry_id
      NOW(),
      NOW()
    ) RETURNING id INTO v_new_entry_id;

  ELSIF v_entry.entry_type = 'Advance' THEN
    -- For Advance: Create tracking entry (no actual money movement, already counted)
    INSERT INTO entries (
      user_id,
      entry_type,
      category,
      payment_method,
      amount,
      remaining_amount,
      entry_date,
      notes,
      is_settlement,
      settlement_type,
      original_entry_id,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      'Advance Settlement',  -- Special entry type for tracking
      v_entry.category,
      v_entry.payment_method,
      p_settlement_amount,
      0,  -- No remaining amount (this is just tracking)
      p_settlement_date,
      'Settlement of ' || v_entry.entry_type || ' ' || v_entry.category || ' (ID: ' || v_entry.id || ')',
      true,  -- is_settlement
      'advance',  -- settlement_type
      v_entry.id,  -- original_entry_id
      NOW(),
      NOW()
    ) RETURNING id INTO v_new_entry_id;

    RAISE NOTICE 'Advance settlement tracking entry created (no cash movement, already counted)';
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

  -- 6. Return success with details
  RETURN json_build_object(
    'success', true,
    'entry_type', v_entry.entry_type,
    'category', v_entry.category,
    'settlement_entry_id', v_new_entry_id,
    'settlement_type', CASE WHEN v_entry.entry_type = 'Credit' THEN 'credit' ELSE 'advance' END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION settle_entry TO authenticated;

COMMENT ON FUNCTION settle_entry IS
'Settles Credit or Advance entries. Creates tracking entry marked with is_settlement=true. For Credit: Cash IN/OUT entry. For Advance: Advance Settlement tracking entry.';

-- ═══════════════════════════════════════════════════════════════════════
-- Verification queries (for testing)
-- ═══════════════════════════════════════════════════════════════════════

-- Count settlement entries by type:
-- SELECT settlement_type, COUNT(*) as count
-- FROM entries
-- WHERE is_settlement = true
-- GROUP BY settlement_type;
--
-- Expected: Shows count of 'credit' and 'advance' settlements

-- View recent settlements:
-- SELECT entry_type, category, amount, settlement_type, entry_date
-- FROM entries
-- WHERE is_settlement = true
-- ORDER BY entry_date DESC
-- LIMIT 10;
