-- Migration: Create Parties (Customers & Vendors) Master Table
-- Date: 2025-12-02
--
-- This migration adds a parties table for managing customers and vendors,
-- and adds an optional party_id foreign key to the entries table.
--
-- IMPORTANT: This is backward-compatible. All existing entries will have
-- party_id = NULL and will continue to work exactly as before.

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 1: Create parties table
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile TEXT,
  party_type TEXT NOT NULL CHECK (party_type IN ('Customer', 'Vendor', 'Both')),
  opening_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name) -- Prevent duplicate party names per user
);

COMMENT ON TABLE parties IS 'Stores customer and vendor (party) information for each user';
COMMENT ON COLUMN parties.party_type IS 'Customer (for sales/collections), Vendor (for purchases/payments), or Both';
COMMENT ON COLUMN parties.opening_balance IS 'Initial balance at the time of party creation';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Add indexes for performance
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_parties_user_id
ON parties(user_id);

CREATE INDEX IF NOT EXISTS idx_parties_type
ON parties(user_id, party_type);

CREATE INDEX IF NOT EXISTS idx_parties_name
ON parties(user_id, name);

COMMENT ON INDEX idx_parties_user_id IS 'Fast lookup of all parties for a user';
COMMENT ON INDEX idx_parties_type IS 'Fast filtering by party type (Customer/Vendor)';
COMMENT ON INDEX idx_parties_name IS 'Fast search by party name';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: Enable Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

-- Users can only view their own parties
CREATE POLICY "Users can view own parties"
  ON parties FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert parties for themselves
CREATE POLICY "Users can insert own parties"
  ON parties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own parties
CREATE POLICY "Users can update own parties"
  ON parties FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own parties
CREATE POLICY "Users can delete own parties"
  ON parties FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can view own parties" ON parties IS
  'Ensures users can only see their own parties';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: Add party_id column to entries table (NULLABLE - backward compatible)
-- ═══════════════════════════════════════════════════════════════════════

-- Add party_id as optional foreign key
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES parties(id) ON DELETE SET NULL;

COMMENT ON COLUMN entries.party_id IS
  'Optional reference to party (customer/vendor). NULL for entries without parties. Backward compatible.';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 5: Add index for party lookups in entries
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_entries_party_id
ON entries(party_id)
WHERE party_id IS NOT NULL;

COMMENT ON INDEX idx_entries_party_id IS
  'Fast lookup of all entries for a specific party. Partial index excludes NULL values.';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 6: Create helper function to get party balance
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_party_balance(p_party_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_opening_balance NUMERIC;
  v_total_debit NUMERIC;
  v_total_credit NUMERIC;
BEGIN
  -- Get opening balance
  SELECT opening_balance INTO v_opening_balance
  FROM parties
  WHERE id = p_party_id;

  -- Calculate total debits (Cash IN, Credit Sales, Advance Received)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_debit
  FROM entries
  WHERE party_id = p_party_id
    AND (entry_type = 'Cash IN' OR
         (entry_type = 'Credit' AND category = 'Sales') OR
         (entry_type = 'Advance' AND category = 'Sales'));

  -- Calculate total credits (Cash OUT, Credit Purchases, Advance Paid)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_credit
  FROM entries
  WHERE party_id = p_party_id
    AND (entry_type = 'Cash OUT' OR
         (entry_type = 'Credit' AND category IN ('COGS', 'Opex', 'Assets')) OR
         (entry_type = 'Advance' AND category IN ('COGS', 'Opex', 'Assets')));

  -- Return net balance
  RETURN v_opening_balance + v_total_debit - v_total_credit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_party_balance IS
  'Calculates current balance for a party including opening balance and all transactions';

-- ═══════════════════════════════════════════════════════════════════════
-- Verification queries (for testing)
-- ═══════════════════════════════════════════════════════════════════════

-- Count parties by type:
-- SELECT party_type, COUNT(*) as count
-- FROM parties
-- GROUP BY party_type;

-- Show entries with parties:
-- SELECT e.entry_type, e.category, e.amount, p.name as party_name, p.party_type
-- FROM entries e
-- LEFT JOIN parties p ON e.party_id = p.id
-- WHERE e.party_id IS NOT NULL
-- ORDER BY e.entry_date DESC
-- LIMIT 10;

-- Calculate party balance:
-- SELECT id, name, opening_balance, get_party_balance(id) as current_balance
-- FROM parties
-- WHERE user_id = auth.uid()
-- ORDER BY name;
