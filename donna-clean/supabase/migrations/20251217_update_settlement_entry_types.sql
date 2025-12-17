-- Migration: Update settlement entry types to be more descriptive
-- Date: 2025-12-17
--
-- This migration updates the settle_entry function to create settlements
-- with descriptive entry types that are immediately recognizable in Transaction History.
--
-- BEFORE:
--   Credit settlements: 'Cash IN' or 'Cash OUT'
--   Advance settlements: 'Advance Settlement'
--
-- AFTER:
--   Credit settlements: 'Credit Settlement (Collections)' or 'Credit Settlement (Bills)'
--   Advance settlements: 'Advance Settlement (Received)' or 'Advance Settlement (Paid)'

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 1: Update settle_entry function with descriptive entry types
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
    -- For Credit: Create settlement entry with descriptive name
    v_settlement_payment_method := CASE
      WHEN v_entry.payment_method IN ('Cash', 'Bank') THEN v_entry.payment_method
      ELSE 'Cash'
    END;

    -- Determine descriptive entry type based on category
    IF v_entry.category = 'Sales' THEN
      v_new_entry_type := 'Credit Settlement (Collections)';
    ELSE
      -- COGS, Opex, Assets
      v_new_entry_type := 'Credit Settlement (Bills)';
    END IF;

    -- Create the settlement entry for Credit
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
      v_new_entry_type,  -- NEW: Descriptive name
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
    -- For Advance: Create tracking entry with descriptive name

    -- Determine descriptive entry type based on category
    IF v_entry.category = 'Sales' THEN
      v_new_entry_type := 'Advance Settlement (Received)';
    ELSE
      -- COGS, Opex, Assets
      v_new_entry_type := 'Advance Settlement (Paid)';
    END IF;

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
      v_new_entry_type,  -- NEW: Descriptive name
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
    'settlement_type', CASE WHEN v_entry.entry_type = 'Credit' THEN 'credit' ELSE 'advance' END,
    'new_entry_type', v_new_entry_type
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION settle_entry IS
'Settles Credit or Advance entries with descriptive settlement names. For Credit: Creates Credit Settlement (Collections/Bills). For Advance: Creates Advance Settlement (Received/Paid).';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Migrate existing settlements to use new descriptive names
-- ═══════════════════════════════════════════════════════════════════════

-- Update existing Credit settlements (Cash IN → Credit Settlement Collections)
UPDATE entries
SET
  entry_type = 'Credit Settlement (Collections)',
  updated_at = NOW()
WHERE is_settlement = true
  AND settlement_type = 'credit'
  AND entry_type = 'Cash IN';

-- Update existing Credit settlements (Cash OUT → Credit Settlement Bills)
UPDATE entries
SET
  entry_type = 'Credit Settlement (Bills)',
  updated_at = NOW()
WHERE is_settlement = true
  AND settlement_type = 'credit'
  AND entry_type = 'Cash OUT';

-- Update existing Advance settlements (Sales → Advance Settlement Received)
UPDATE entries
SET
  entry_type = 'Advance Settlement (Received)',
  updated_at = NOW()
WHERE is_settlement = true
  AND settlement_type = 'advance'
  AND entry_type = 'Advance Settlement'
  AND category = 'Sales';

-- Update existing Advance settlements (Expenses → Advance Settlement Paid)
UPDATE entries
SET
  entry_type = 'Advance Settlement (Paid)',
  updated_at = NOW()
WHERE is_settlement = true
  AND settlement_type = 'advance'
  AND entry_type = 'Advance Settlement'
  AND category IN ('COGS', 'Opex', 'Assets');

-- Log migration results
DO $$
DECLARE
  v_credit_collections INTEGER;
  v_credit_bills INTEGER;
  v_advance_received INTEGER;
  v_advance_paid INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_credit_collections
  FROM entries
  WHERE is_settlement = true
    AND entry_type = 'Credit Settlement (Collections)';

  SELECT COUNT(*) INTO v_credit_bills
  FROM entries
  WHERE is_settlement = true
    AND entry_type = 'Credit Settlement (Bills)';

  SELECT COUNT(*) INTO v_advance_received
  FROM entries
  WHERE is_settlement = true
    AND entry_type = 'Advance Settlement (Received)';

  SELECT COUNT(*) INTO v_advance_paid
  FROM entries
  WHERE is_settlement = true
    AND entry_type = 'Advance Settlement (Paid)';

  RAISE NOTICE '✅ Migration Complete:';
  RAISE NOTICE '   - Credit Settlement (Collections): %', v_credit_collections;
  RAISE NOTICE '   - Credit Settlement (Bills): %', v_credit_bills;
  RAISE NOTICE '   - Advance Settlement (Received): %', v_advance_received;
  RAISE NOTICE '   - Advance Settlement (Paid): %', v_advance_paid;
  RAISE NOTICE '   - Total Settlements: %', v_credit_collections + v_credit_bills + v_advance_received + v_advance_paid;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Verification queries (for testing)
-- ═══════════════════════════════════════════════════════════════════════

-- View all settlement types:
-- SELECT entry_type, settlement_type, category, COUNT(*) as count
-- FROM entries
-- WHERE is_settlement = true
-- GROUP BY entry_type, settlement_type, category
-- ORDER BY settlement_type, entry_type;
--
-- Expected output:
--   Credit Settlement (Bills)        | credit  | COGS/Opex | X
--   Credit Settlement (Collections)  | credit  | Sales     | X
--   Advance Settlement (Paid)        | advance | COGS/Opex | X
--   Advance Settlement (Received)    | advance | Sales     | X
