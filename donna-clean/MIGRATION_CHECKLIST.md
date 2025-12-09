# CRITICAL: Run These Migrations in Exact Order

## ⚠️ READ THIS FIRST
Your code is correct. The database has old data. Run these 3 migrations NOW.

---

## Migration 1: Update Entry Types in Database

Run this SQL in Supabase SQL Editor:

```sql
-- Update all old entries to new terminology
UPDATE entries SET entry_type = 'Cash IN' WHERE entry_type = 'Cash Inflow';
UPDATE entries SET entry_type = 'Cash OUT' WHERE entry_type = 'Cash Outflow';

-- Verify (both should return 0)
SELECT
  (SELECT COUNT(*) FROM entries WHERE entry_type = 'Cash Inflow') as old_inflow,
  (SELECT COUNT(*) FROM entries WHERE entry_type = 'Cash Outflow') as old_outflow;
```

**Expected result:** `old_inflow: 0, old_outflow: 0`

---

## Migration 2: Fix settle_entry Function

Copy and run the entire SQL from this file:
`supabase/migrations/fix-settle-entry-logic.sql`

**This ensures:**
- Credit Sales → Creates 'Cash IN' (not 'Cash Inflow')
- Credit COGS/OpEx → Creates 'Cash OUT' (not 'Cash Outflow' or 'Cash IN')

---

## Migration 3: Fix Any Incorrectly Settled Entries (if you've already tested settlements)

```sql
-- Find any Cash IN entries for COGS/OpEx (should be Cash OUT)
SELECT id, entry_type, category, amount, notes, entry_date
FROM entries
WHERE entry_type = 'Cash IN'
  AND category IN ('COGS', 'Opex', 'Assets')
  AND notes LIKE 'Settlement of%'
ORDER BY entry_date DESC;

-- Fix them (change to Cash OUT)
UPDATE entries
SET entry_type = 'Cash OUT'
WHERE entry_type = 'Cash IN'
  AND category IN ('COGS', 'Opex', 'Assets')
  AND notes LIKE 'Settlement of%';
```

---

## ✅ Verification Steps

After running ALL 3 migrations:

### Test 1: Credit Sale
1. Create Credit Sale ₹1,000
2. **Check Profit Lens** → Should show ₹1,000 Revenue ✅
3. **Check Cash Pulse** → Should show NO change ✅
4. Settle the Credit Sale
5. **Check Cash Pulse** → Should show +₹1,000 Cash IN ✅
6. **Check Profit Lens** → Should STILL show ₹1,000 (no double-count) ✅

### Test 2: Credit COGS
1. Create Credit COGS ₹500
2. **Check Profit Lens** → Should show ₹500 Expenses ✅
3. **Check Cash Pulse** → Should show NO change ✅
4. Settle the Credit COGS
5. **Check Cash Pulse** → Should show +₹500 Cash OUT ✅ **NOT Cash IN!**
6. **Check Profit Lens** → Should STILL show ₹500 (no double-count) ✅

### Test 3: Advance Sale
1. Create Advance Sale ₹2,000
2. **Check Cash Pulse** → Should show +₹2,000 Cash IN ✅
3. **Check Profit Lens** → Should show NO change ✅
4. Settle the Advance Sale
5. **Check Profit Lens** → Should show +₹2,000 Revenue ✅
6. **Check Cash Pulse** → Should STILL show ₹2,000 (no double-count) ✅

### Test 4: Check Database
Visit `/admin/diagnostics` and verify:
- Entry Types section shows NO "Cash Inflow" or "Cash Outflow" ✅
- All calculations match your manual checks ✅

---

## 🔍 Diagnostics

If tests still fail after migrations:

Visit: `/admin/diagnostics`

This page shows:
1. Entry type distribution (detects old terminology)
2. Cash Pulse breakdown
3. Profit Lens breakdown
4. Recent entries with their actual database values

**Take a screenshot and share if issues persist.**

---

## 📊 Code Verification Complete

✅ `analytics-new.ts` - Correct logic for Cash Pulse
✅ `profit-calculations-new.ts` - Correct logic for Profit Lens
✅ Credit entries counted in Profit Lens immediately (no settled check)
✅ Advance entries counted in Cash Pulse immediately
✅ Advance entries counted in Profit Lens only when settled

**The code is ready. Just run the migrations above.** 🚀
