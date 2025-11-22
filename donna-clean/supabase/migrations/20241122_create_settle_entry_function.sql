-- Migration: Add settle_entry RPC function with transaction support
-- Purpose: Atomic settlement operations (INSERT + UPDATE) to prevent data inconsistencies
-- Date: 2024-11-22

-- Create the settle_entry function
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
  v_is_inflow BOOLEAN;
BEGIN
  -- Start transaction (automatic in function)
  -- All operations below are atomic - they ALL succeed or ALL fail
  
  -- 1. Load and lock the entry for update
  -- FOR UPDATE ensures no concurrent settlements on the same entry
  SELECT * INTO v_entry
  FROM entries
  WHERE id = p_entry_id
    AND user_id = p_user_id
  FOR UPDATE;
  
  -- Validate entry exists and user owns it
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Entry not found or not accessible'
    );
  END IF;
  
  -- 2. Validate entry type
  IF v_entry.entry_type NOT IN ('Credit', 'Advance') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only Credit and Advance entries can be settled'
    );
  END IF;
  
  -- 3. Calculate and validate remaining amount
  v_remaining_amount := COALESCE(v_entry.remaining_amount, v_entry.amount);
  
  IF p_settlement_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Settlement amount must be greater than zero'
    );
  END IF;
  
  IF p_settlement_amount > v_remaining_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Settlement amount exceeds remaining balance'
    );
  END IF;
  
  -- 4. For Credit entries, create corresponding Cash entry
  -- This INSERT and the UPDATE below are atomic - both succeed or both rollback
  IF v_entry.entry_type = 'Credit' THEN
    v_is_inflow := (v_entry.category = 'Sales');
    v_settlement_payment_method := CASE
      WHEN v_entry.payment_method IN ('Cash', 'Bank') THEN v_entry.payment_method
      ELSE 'Cash'
    END;
    
    -- INSERT cash entry
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
      CASE WHEN v_is_inflow THEN 'Cash Inflow' ELSE 'Cash Outflow' END,
      v_entry.category,
      v_settlement_payment_method,
      p_settlement_amount,
      p_settlement_amount,
      p_settlement_date,
      'Settlement of credit ' || LOWER(v_entry.category) || ' (' || v_entry.id || ')',
      NOW(),
      NOW()
    );
    -- If INSERT fails, entire function rolls back (including the UPDATE below)
  END IF;
  
  -- 5. Update original entry with settlement info
  v_next_remaining := GREATEST(v_remaining_amount - p_settlement_amount, 0);
  v_is_fully_settled := (v_next_remaining <= 0);
  
  UPDATE entries
  SET
    remaining_amount = v_next_remaining,
    settled = v_is_fully_settled,
    settled_at = CASE WHEN v_is_fully_settled THEN p_settlement_date::TIMESTAMPTZ ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_entry_id
    AND user_id = p_user_id;
  -- If UPDATE fails, entire function rolls back (including the INSERT above)
  
  -- 6. Success - transaction will auto-commit
  RETURN json_build_object(
    'success', true
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Automatic rollback on ANY error
    -- If we inserted a cash entry and the update fails, the INSERT is rolled back
    -- If any constraint is violated, everything is rolled back
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION settle_entry TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION settle_entry IS 'Atomically settles a Credit or Advance entry. For Credit entries, creates a Cash entry and updates the original entry within a single transaction. Prevents partial failures and data inconsistencies.';
