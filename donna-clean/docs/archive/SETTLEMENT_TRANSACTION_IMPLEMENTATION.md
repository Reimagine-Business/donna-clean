# Settlement Transaction Implementation Guide

## ✅ Solution: Atomic Settlements with PostgreSQL RPC

This guide shows how to implement transaction support for settlement operations.

---

## Problem Summary

**Current Issue:** ⚠️ NO TRANSACTION SUPPORT

The current settlement operation performs two sequential database operations:
1. INSERT cash entry (for Credit settlements)
2. UPDATE original entry

**Risk:** If INSERT succeeds but UPDATE fails:
- 🔴 Cash entry exists (money recorded)
- 🔴 Original entry not updated (still shows full amount owed)
- 🔴 User can settle again → Double-counting

---

## Solution Overview

Use PostgreSQL stored procedure with automatic transaction management.

### Benefits:
- ✅ **Atomic**: Both operations succeed or both fail
- ✅ **Automatic rollback**: PostgreSQL handles rollback on error
- ✅ **Row locking**: Prevents concurrent settlements
- ✅ **Single round-trip**: Better performance
- ✅ **Database-enforced**: Can't be bypassed

---

## Implementation Steps

### Step 1: Run the Migration

Apply the SQL migration to create the `settle_entry` function:

```bash
# Using Supabase CLI
supabase db push

# Or directly in Supabase Studio SQL Editor
# Copy the contents of: supabase/migrations/20241122_create_settle_entry_function.sql
```

**File Created:** `supabase/migrations/20241122_create_settle_entry_function.sql`

---

### Step 2: Update the Server Action

Replace the current settlement logic with the atomic version:

```bash
# Backup current version
mv app/settlements/actions.ts app/settlements/actions.OLD.ts

# Use atomic version
mv app/settlements/actions.ATOMIC.ts app/settlements/actions.ts
```

**Or manually update** `app/settlements/actions.ts`:

**Replace this (CURRENT - NON-ATOMIC):**

```typescript
// Load entry
const latestEntry = await loadLatestEntry(supabase, entryId, user.id);

// Validation...

// INSERT cash entry
if (latestEntry.entry_type === "Credit") {
  const { error: cashEntryError } = await supabase.from("entries").insert({...});
  if (cashEntryError) {
    return { success: false, error: cashEntryError.message };
  }
}

// UPDATE original entry
const { error: updateError } = await supabase
  .from("entries")
  .update({...})
  .eq("id", latestEntry.id);

if (updateError) {
  return { success: false, error: updateError.message };
}
```

**With this (NEW - ATOMIC):**

```typescript
// ✅ Call atomic RPC function (includes transaction + validation)
const { data, error } = await supabase.rpc('settle_entry', {
  p_entry_id: entryId,
  p_user_id: user.id,
  p_settlement_amount: settledAmount,
  p_settlement_date: settlementDate,
});

if (error) {
  console.error("Failed to settle entry via RPC", error);
  return { success: false, error: error.message };
}

// Parse JSON response from database function
const result = data as { success: boolean; error?: string };

if (!result.success) {
  return { success: false, error: result.error || "Settlement failed" };
}
```

---

### Step 3: Remove Helper Functions (No Longer Needed)

These functions are now handled by the database:

```typescript
// ❌ REMOVE: No longer needed
async function loadLatestEntry(...) { ... }

// ✅ KEEP: Still used for client-side validation
function normalizeAmount(value: unknown, fallback: number) { ... }
```

---

### Step 4: Test the Implementation

#### Test 1: Normal Settlement

```typescript
// Should succeed
const result = await createSettlement(
  "entry-id-123",
  500,
  "2024-01-15"
);

expect(result.success).toBe(true);
```

#### Test 2: Partial Settlement

```typescript
// Credit entry: $1000 remaining
// Settle $500
const result1 = await createSettlement("entry-id-123", 500, "2024-01-15");
expect(result1.success).toBe(true);

// Should show $500 remaining
const entry = await fetchEntry("entry-id-123");
expect(entry.remaining_amount).toBe(500);
expect(entry.settled).toBe(false);

// Settle remaining $500
const result2 = await createSettlement("entry-id-123", 500, "2024-01-16");
expect(result2.success).toBe(true);
expect(entry.settled).toBe(true);
```

#### Test 3: Over-Settlement (Should Fail)

```typescript
// Credit entry: $500 remaining
// Try to settle $600
const result = await createSettlement("entry-id-123", 600, "2024-01-15");

expect(result.success).toBe(false);
expect(result.error).toContain("exceeds remaining balance");
```

#### Test 4: Concurrent Settlements

```typescript
// Credit entry: $500 remaining
// Two users try to settle $500 simultaneously

const promise1 = createSettlement("entry-id-123", 500, "2024-01-15");
const promise2 = createSettlement("entry-id-123", 500, "2024-01-15");

const [result1, result2] = await Promise.all([promise1, promise2]);

// Only one should succeed (row locking prevents both)
const succeeded = [result1, result2].filter(r => r.success);
expect(succeeded.length).toBe(1);
```

#### Test 5: Network Failure During Settlement

```typescript
// Simulate network failure
// With transaction: Either both operations complete or neither
// Without transaction: Could have orphaned cash entry

// Try settlement (might timeout)
try {
  await createSettlement("entry-id-123", 500, "2024-01-15");
} catch (error) {
  // Check database state
  const cashEntries = await supabase
    .from("entries")
    .select()
    .eq("notes", "Settlement of credit...");
  
  const originalEntry = await supabase
    .from("entries")
    .select()
    .eq("id", "entry-id-123")
    .single();
  
  // With atomic transaction:
  // - If cash entry exists, original entry MUST be updated
  // - If original entry not updated, cash entry MUST NOT exist
  // - No orphaned records possible
}
```

---

### Step 5: Monitor for Issues

Add monitoring to detect any settlement issues:

```sql
-- Query to find potential orphaned cash entries
-- (Should return 0 rows with atomic implementation)
SELECT 
  ce.id as cash_entry_id,
  ce.notes,
  ce.amount,
  ce.created_at,
  oe.id as original_entry_id,
  oe.remaining_amount,
  oe.settled
FROM entries ce
LEFT JOIN entries oe ON ce.notes LIKE '%(' || oe.id || ')'
WHERE ce.entry_type IN ('Cash Inflow', 'Cash Outflow')
  AND ce.notes LIKE 'Settlement of credit%'
  AND oe.remaining_amount IS NOT NULL
  AND oe.remaining_amount = oe.amount -- Not updated
ORDER BY ce.created_at DESC;
```

---

## Comparison: Before vs After

### Before (Non-Atomic):

```typescript
// Step 1: INSERT cash entry
await supabase.from("entries").insert({...});
// ✅ Committed to database

// Step 2: UPDATE original entry
await supabase.from("entries").update({...});
// ❌ If this fails, cash entry is orphaned!
```

**Timeline:**
```
t0: Start settlement
t1: INSERT cash entry → Success ✅
t2: Cash entry committed to database
t3: UPDATE original entry → FAIL ❌
t4: Return error
Result: 🔴 Cash entry exists, original entry unchanged
```

---

### After (Atomic):

```typescript
// Single RPC call (atomic transaction)
await supabase.rpc('settle_entry', {...});
```

**Timeline:**
```
t0: Start settlement
t1: BEGIN TRANSACTION
t2: SELECT ... FOR UPDATE (lock entry)
t3: INSERT cash entry (in transaction)
t4: UPDATE original entry (in transaction)
t5a: If both succeed → COMMIT ✅
t5b: If either fails → ROLLBACK ❌
Result: ✅ Both operations succeed or both fail
```

---

## Error Messages

### Database Function Returns:

| Error | Meaning |
|-------|---------|
| "Entry not found or not accessible" | Entry doesn't exist or user doesn't own it |
| "Only Credit and Advance entries can be settled" | Wrong entry type |
| "Settlement amount must be greater than zero" | Invalid amount |
| "Settlement amount exceeds remaining balance" | Over-settlement attempt |
| Generic SQL error | Database constraint violation |

---

## Rollback

To revert to non-atomic version:

```bash
# Restore old Server Action
mv app/settlements/actions.OLD.ts app/settlements/actions.ts

# Remove database function (optional - it won't be called)
# supabase db reset
```

---

## Performance Impact

### Before:
- 3 database round-trips (SELECT, INSERT, UPDATE)
- No row locking
- No transaction overhead

### After:
- 1 database round-trip (RPC call)
- Row locking (prevents concurrent settlements)
- Transaction overhead (minimal)

**Net Result:** ✅ **Faster** (single round-trip) + **Safer** (atomic)

---

## Files Created

1. ✅ `supabase/migrations/20241122_create_settle_entry_function.sql` - Database migration
2. ✅ `app/settlements/actions.ATOMIC.ts` - Updated Server Action (atomic version)
3. ✅ `SETTLEMENT_ATOMICITY_ANALYSIS.md` - Detailed analysis
4. ✅ `SETTLEMENT_TRANSACTION_IMPLEMENTATION.md` - This implementation guide

---

## Deployment Checklist

### Pre-Deployment:

- [ ] Run migration in development environment
- [ ] Test all settlement scenarios
- [ ] Verify concurrent settlement handling
- [ ] Check error messages are user-friendly
- [ ] Backup production database

### Deployment:

- [ ] Deploy migration to production
- [ ] Deploy updated Server Action
- [ ] Monitor settlement operations
- [ ] Check for any orphaned entries
- [ ] Verify Realtime events still work

### Post-Deployment:

- [ ] Test settlement in production
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Verify no data inconsistencies

---

## FAQs

### Q: Do I need to change the client-side code?

**A:** No! The client-side settlement dialog (`settle-entry-dialog.tsx`) already calls `createSettlement()` as a Server Action. No changes needed.

### Q: Will this affect Realtime subscriptions?

**A:** No. The RPC function still emits INSERT and UPDATE events like before. Realtime subscriptions will receive these events normally.

### Q: What happens to existing orphaned entries?

**A:** The migration doesn't fix existing data. You may need to manually clean up any orphaned cash entries created before this fix.

### Q: Can I test this locally?

**A:** Yes! Run the migration locally with `supabase db push` and test in your development environment before deploying to production.

### Q: What if the RPC call times out?

**A:** The transaction will automatically rollback. No partial data will be committed. The user can safely retry the settlement.

---

## Next Steps

1. **Apply Migration**
   ```bash
   supabase db push
   ```

2. **Update Server Action**
   ```bash
   mv app/settlements/actions.ATOMIC.ts app/settlements/actions.ts
   ```

3. **Test Thoroughly**
   - Run through all test scenarios
   - Verify error handling
   - Check concurrent settlements

4. **Deploy to Production**
   - Follow deployment checklist
   - Monitor for issues
   - Be ready to rollback if needed

5. **Clean Up Old Data (Optional)**
   - Query for orphaned entries
   - Manually reconcile if needed

---

## Support

If you encounter issues:

1. Check Supabase logs for RPC errors
2. Verify the migration was applied successfully
3. Test with a single settlement first
4. Roll back if critical issues occur

---

## Summary

**Risk Level Before:** 🔴 HIGH (data inconsistency possible)  
**Risk Level After:** 🟢 LOW (atomic operations guaranteed)

**Recommendation:** **Deploy ASAP** to prevent data inconsistencies.
