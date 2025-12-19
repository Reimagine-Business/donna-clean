-- Migration: Use Descriptive Settlement Types
-- Date: 2025-12-19
--
-- Problem: Settlements using "Cash IN" and "Cash OUT" are not visually distinct
-- from regular cash entries in Transaction History
--
-- Solution: Use descriptive settlement types that:
--   1. Clearly show what they are (settlements)
--   2. Appear in filter dropdown with proper labels
--   3. Are distinct from regular Cash IN/OUT
--   4. Still affect Cash Pulse correctly (via frontend calculation updates)
--
-- Descriptive Types:
--   - 'Credit Settlement (Collections)' - Credit Sales settlements
--   - 'Credit Settlement (Bills)' - Credit Expense settlements
--   - 'Advance Settlement (Received)' - Advance Sales settlements
--   - 'Advance Settlement (Paid)' - Advance Expense settlements

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 1: Update settle_entry function to use descriptive names
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
  v_settlement_entry_type TEXT;
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

  -- 4. Create settlement entry with descriptive type
  IF v_entry.entry_type = 'Credit' THEN
    -- Determine payment method
    v_settlement_payment_method := CASE
      WHEN v_entry.payment_method IN ('Cash', 'Bank') THEN v_entry.payment_method
      ELSE 'Cash'
    END;

    -- Use descriptive settlement names for Credit
    IF v_entry.category = 'Sales' THEN
      v_settlement_entry_type := 'Credit Settlement (Collections)';
    ELSIF v_entry.category IN ('COGS', 'Opex', 'Assets') THEN
      v_settlement_entry_type := 'Credit Settlement (Bills)';
    ELSE
      v_settlement_entry_type := 'Credit Settlement (Other)';
    END IF;

    -- Create the settlement entry
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
      v_settlement_entry_type,  -- Descriptive name (e.g., "Credit Settlement (Collections)")
      v_entry.category,
      v_settlement_payment_method,
      p_settlement_amount,
      p_settlement_amount,
      p_settlement_date,
      'Settlement of Credit ' || v_entry.category,
      true,
      'credit',
      v_entry.id,
      NOW(),
      NOW()
    ) RETURNING id INTO v_new_entry_id;

  ELSIF v_entry.entry_type = 'Advance' THEN
    -- Determine payment method
    v_settlement_payment_method := CASE
      WHEN v_entry.payment_method IN ('Cash', 'Bank') THEN v_entry.payment_method
      ELSE 'Cash'
    END;

    -- Use descriptive settlement names for Advance
    IF v_entry.category = 'Sales' THEN
      v_settlement_entry_type := 'Advance Settlement (Received)';
    ELSE
      v_settlement_entry_type := 'Advance Settlement (Paid)';
    END IF;

    -- Create the settlement entry
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
      v_settlement_entry_type,  -- Descriptive name (e.g., "Advance Settlement (Received)")
      v_entry.category,
      v_settlement_payment_method,
      p_settlement_amount,
      p_settlement_amount,
      p_settlement_date,
      'Settlement of Advance ' || v_entry.category,
      true,
      'advance',
      v_entry.id,
      NOW(),
      NOW()
    ) RETURNING id INTO v_new_entry_id;
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
    'settlement_entry_id', v_new_entry_id,
    'settlement_entry_type', v_settlement_entry_type
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION settle_entry IS
'Settles Credit or Advance entries using descriptive settlement types. Creates settlement entries that are visually distinct in Transaction History while still affecting Cash Pulse calculations.';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Convert existing Cash IN/OUT settlements to descriptive types
-- ═══════════════════════════════════════════════════════════════════════

-- Convert Cash IN settlements back to Credit Settlement (Collections)
UPDATE entries
SET
  entry_type = 'Credit Settlement (Collections)',
  updated_at = NOW()
WHERE is_settlement = true
  AND settlement_type = 'credit'
  AND entry_type = 'Cash IN'
  AND category = 'Sales';

-- Convert Cash OUT settlements back to Credit Settlement (Bills)
UPDATE entries
SET
  entry_type = 'Credit Settlement (Bills)',
  updated_at = NOW()
WHERE is_settlement = true
  AND settlement_type = 'credit'
  AND entry_type = 'Cash OUT'
  AND category IN ('COGS', 'Opex', 'Assets');

-- Update any Advance settlements that might exist as Cash IN/OUT
UPDATE entries
SET
  entry_type = 'Advance Settlement (Received)',
  updated_at = NOW()
WHERE is_settlement = true
  AND settlement_type = 'advance'
  AND category = 'Sales'
  AND (entry_type = 'Cash IN' OR entry_type = 'Advance');

UPDATE entries
SET
  entry_type = 'Advance Settlement (Paid)',
  updated_at = NOW()
WHERE is_settlement = true
  AND settlement_type = 'advance'
  AND category IN ('COGS', 'Opex', 'Assets')
  AND (entry_type = 'Cash OUT' OR entry_type = 'Advance');

-- Log migration results
DO $$
DECLARE
  v_collections_count INTEGER;
  v_bills_count INTEGER;
  v_advance_received_count INTEGER;
  v_advance_paid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_collections_count
  FROM entries
  WHERE is_settlement = true
    AND entry_type = 'Credit Settlement (Collections)';

  SELECT COUNT(*) INTO v_bills_count
  FROM entries
  WHERE is_settlement = true
    AND entry_type = 'Credit Settlement (Bills)';

  SELECT COUNT(*) INTO v_advance_received_count
  FROM entries
  WHERE is_settlement = true
    AND entry_type = 'Advance Settlement (Received)';

  SELECT COUNT(*) INTO v_advance_paid_count
  FROM entries
  WHERE is_settlement = true
    AND entry_type = 'Advance Settlement (Paid)';

  RAISE NOTICE '✅ Settlement Types Migrated to Descriptive Names:';
  RAISE NOTICE '   - Credit Settlement (Collections): %', v_collections_count;
  RAISE NOTICE '   - Credit Settlement (Bills): %', v_bills_count;
  RAISE NOTICE '   - Advance Settlement (Received): %', v_advance_received_count;
  RAISE NOTICE '   - Advance Settlement (Paid): %', v_advance_paid_count;
  RAISE NOTICE '   - Total: %', v_collections_count + v_bills_count + v_advance_received_count + v_advance_paid_count;
  RAISE NOTICE '';
  RAISE NOTICE '📊 These settlements are now visually distinct in Transaction History!';
  RAISE NOTICE '💰 They still affect Cash Pulse (via frontend calculations)';
END $$;
