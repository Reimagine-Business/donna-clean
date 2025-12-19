-- Migration: Fix settlement entry types to affect Cash Pulse
-- Date: 2025-12-19
--
-- Problem: Credit settlements were using custom entry types:
--   - 'Credit Settlement (Collections)'
--   - 'Credit Settlement (Bills)'
--
-- These types are not recognized by the app's EntryType, so they don't:
--   1. Affect Cash Pulse (as they should!)
--   2. Show up correctly in the UI
--   3. Match TypeScript type definitions
--
-- Solution: Use standard 'Cash IN' and 'Cash OUT' types
--   - Credit Sales settlement → 'Cash IN' (increases Cash Pulse)
--   - Credit Expenses settlement → 'Cash OUT' (decreases Cash Pulse)
--   - Keep is_settlement flag for tracking

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 1: Update settle_entry function to use Cash IN/OUT
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
  v_cash_entry_type TEXT;
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

  -- 4. Create Cash entry for Credit settlements
  IF v_entry.entry_type = 'Credit' THEN
    -- Determine payment method
    v_settlement_payment_method := CASE
      WHEN v_entry.payment_method IN ('Cash', 'Bank') THEN v_entry.payment_method
      ELSE 'Cash'
    END;

    -- ✅ FIX: Use Cash IN/OUT instead of custom settlement types
    -- This ensures settlements affect Cash Pulse!
    IF v_entry.category = 'Sales' THEN
      v_cash_entry_type := 'Cash IN';  -- Credit Sales → Cash IN (increases Cash Pulse)
    ELSE
      v_cash_entry_type := 'Cash OUT';  -- Credit Expenses → Cash OUT (decreases Cash Pulse)
    END IF;

    -- Create the Cash IN/OUT entry
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
      v_cash_entry_type,  -- ✅ Cash IN or Cash OUT (affects Cash Pulse)
      v_entry.category,
      v_settlement_payment_method,
      p_settlement_amount,
      p_settlement_amount,
      p_settlement_date,
      'Settlement of ' || v_entry.entry_type || ' ' || v_entry.category || ' (ID: ' || v_entry.id || ')',
      true,  -- is_settlement flag for tracking
      'credit',
      v_entry.id,
      NOW(),
      NOW()
    ) RETURNING id INTO v_new_entry_id;

  ELSIF v_entry.entry_type = 'Advance' THEN
    -- For Advance: Just mark as settled, no new cash entry
    -- (Advance already affected Cash Pulse when created)
    RAISE NOTICE 'Advance settlement - no new cash entry needed (already counted in Cash Pulse)';
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

  -- 6. Return success
  RETURN json_build_object(
    'success', true,
    'entry_type', v_entry.entry_type,
    'category', v_entry.category,
    'settlement_entry_id', v_new_entry_id,
    'cash_entry_type', v_cash_entry_type
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION settle_entry IS
'Settles Credit or Advance entries. For Credit: Creates Cash IN/OUT entry that affects Cash Pulse. For Advance: Just marks as settled (already in Cash Pulse).';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Migrate existing settlement entries to Cash IN/OUT
-- ═══════════════════════════════════════════════════════════════════════

-- Update Credit Settlement (Collections) → Cash IN
UPDATE entries
SET
  entry_type = 'Cash IN',
  updated_at = NOW()
WHERE is_settlement = true
  AND settlement_type = 'credit'
  AND entry_type = 'Credit Settlement (Collections)';

-- Update Credit Settlement (Bills) → Cash OUT
UPDATE entries
SET
  entry_type = 'Cash OUT',
  updated_at = NOW()
WHERE is_settlement = true
  AND settlement_type = 'credit'
  AND entry_type = 'Credit Settlement (Bills)';

-- Log migration results
DO $$
DECLARE
  v_cash_in_count INTEGER;
  v_cash_out_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_cash_in_count
  FROM entries
  WHERE is_settlement = true
    AND settlement_type = 'credit'
    AND entry_type = 'Cash IN';

  SELECT COUNT(*) INTO v_cash_out_count
  FROM entries
  WHERE is_settlement = true
    AND settlement_type = 'credit'
    AND entry_type = 'Cash OUT';

  RAISE NOTICE '✅ Settlement Entry Types Fixed:';
  RAISE NOTICE '   - Cash IN (Collections): %', v_cash_in_count;
  RAISE NOTICE '   - Cash OUT (Bills): %', v_cash_out_count;
  RAISE NOTICE '   - Total Fixed: %', v_cash_in_count + v_cash_out_count;
  RAISE NOTICE '';
  RAISE NOTICE '📊 These entries now affect Cash Pulse!';
END $$;
