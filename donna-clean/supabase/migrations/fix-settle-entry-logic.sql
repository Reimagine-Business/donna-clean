-- Migration: Fix settle_entry function with improved logic and diagnostics
-- This ensures Credit settlements create the correct Cash entry types
-- Date: 2025-11-29

DROP FUNCTION IF EXISTS settle_entry(UUID, UUID, NUMERIC, DATE);

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

  -- 4. For Credit entries ONLY, create corresponding Cash entry
  IF v_entry.entry_type = 'Credit' THEN
    -- Determine payment method
    v_settlement_payment_method := CASE
      WHEN v_entry.payment_method IN ('Cash', 'Bank') THEN v_entry.payment_method
      ELSE 'Cash'
    END;

    -- ✅ CRITICAL FIX: Determine correct entry type based on category
    -- Sales = Cash IN (collection)
    -- COGS/OpEx/Assets = Cash OUT (payment)
    IF v_entry.category = 'Sales' THEN
      v_new_entry_type := 'Cash IN';
    ELSE
      v_new_entry_type := 'Cash OUT';
    END IF;

    -- Create the cash entry with correct type
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
      v_new_entry_type,  -- ✅ Uses correct type: 'Cash IN' or 'Cash OUT'
      v_entry.category,
      v_settlement_payment_method,
      p_settlement_amount,
      p_settlement_amount,
      p_settlement_date,
      'Settlement of ' || v_entry.entry_type || ' ' || v_entry.category || ' (ID: ' || v_entry.id || ')',
      NOW(),
      NOW()
    );
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
    'cash_entry_created', (v_entry.entry_type = 'Credit'),
    'cash_entry_type', v_new_entry_type
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION settle_entry TO authenticated;

COMMENT ON FUNCTION settle_entry IS 'Settles Credit or Advance entries. Credit settlements create Cash IN (Sales) or Cash OUT (expenses). Advance settlements only mark as settled for P&L recognition.';
