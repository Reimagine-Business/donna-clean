# Settlement Operation - Atomicity Analysis

## Critical Issue: ⚠️ NO TRANSACTION SUPPORT

### Current Implementation

**File:** `app/settlements/actions.ts`

**Pattern:** Sequential operations WITHOUT transaction support

---

## 1. Complete Code

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { normalizeEntry, type Entry, type SupabaseEntry } from "@/lib/entries";

type SettleEntryResult =
  | { success: true }
  | { success: false; error: string };

export async function createSettlement(
  entryId: string,
  amount: number,
  settlementDate: string
): Promise<SettleEntryResult> {
  const ctx = "settlements/createSettlement";
  
  try {
    const supabase = await createSupabaseServerClient();
    const settledAmount = normalizeAmount(amount, 0);

    if (settledAmount <= 0) {
      return { success: false, error: "Settlement amount must be greater than zero." };
    }

    const { user, initialError } = await getOrRefreshUser(supabase);

    if (!user) {
      console.error(
        `[Auth Fail] No user in ${ctx}${
          initialError ? ` – error: ${initialError.message}` : ""
        }`,
        initialError ?? undefined,
      );
      return { success: false, error: "You must be signed in to settle entries." };
    }

    // Load the entry to be settled
    const latestEntry = await loadLatestEntry(supabase, entryId, user.id);

    if (latestEntry.user_id && latestEntry.user_id !== user.id) {
      return { success: false, error: "You can only settle your own entries." };
    }

    if (latestEntry.entry_type !== "Credit" && latestEntry.entry_type !== "Advance") {
      return { success: false, error: "Only Credit and Advance entries can be settled." };
    }

    const remainingAmount = normalizeAmount(
      latestEntry.remaining_amount ?? latestEntry.amount,
      latestEntry.amount,
    );

    if (settledAmount > remainingAmount) {
      return { success: false, error: "Settlement amount exceeds remaining balance." };
    }

    // ⚠️ OPERATION 1: INSERT cash entry (Credit settlements only)
    if (latestEntry.entry_type === "Credit") {
      const isInflow = latestEntry.category === "Sales";
      const settlementPaymentMethod =
        latestEntry.payment_method === "Cash" || latestEntry.payment_method === "Bank"
          ? latestEntry.payment_method
          : "Cash";
          
      const { error: cashEntryError } = await supabase.from("entries").insert({
        user_id: user.id,
        entry_type: isInflow ? "Cash Inflow" : "Cash Outflow",
        category: latestEntry.category,
        payment_method: settlementPaymentMethod,
        amount: settledAmount,
        remaining_amount: settledAmount,
        entry_date: settlementDate,
        notes: `Settlement of credit ${latestEntry.category.toLowerCase()} (${latestEntry.id})`,
      });

      if (cashEntryError) {
        console.error("Failed to create cash entry for settlement", cashEntryError);
        return { success: false, error: cashEntryError.message };
      }
    }

    // ⚠️ OPERATION 2: UPDATE original entry
    const nextRemainingAmount = Number(Math.max(remainingAmount - settledAmount, 0).toFixed(2));
    const isFullySettled = nextRemainingAmount <= 0;

    const { error: updateError } = await supabase
      .from("entries")
      .update({
        remaining_amount: nextRemainingAmount,
        settled: isFullySettled,
        settled_at: isFullySettled ? settlementDate : null,
      })
      .eq("id", latestEntry.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update entry with settlement info", updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath("/daily-entries");
    revalidatePath("/cashpulse");
    revalidatePath("/profit-lens");

    return { success: true };
  } catch (error) {
    console.error("Failed to settle entry", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to settle entry.",
    };
  }
}

async function loadLatestEntry(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  entryId: string,
  userId: string,
): Promise<Entry> {
  const { data, error } = await supabase
    .from("entries")
    .select(
      "id, user_id, entry_type, category, payment_method, amount, remaining_amount, entry_date, notes, image_url, settled, settled_at, created_at, updated_at",
    )
    .eq("id", entryId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Entry not found or no longer accessible.");
  }

  return normalizeEntry(data as SupabaseEntry);
}

function normalizeAmount(value: unknown, fallback: number): number {
  const candidate =
    typeof value === "number" ? value : Number.isFinite(Number(value)) ? Number(value) : fallback;
  return Number(Number(candidate).toFixed(2));
}
```

---

## 2. Atomicity Status: ❌ NOT ATOMIC

### Current Behavior:

```
Step 1: INSERT cash entry (for Credit settlements)
   ↓
   (NO TRANSACTION BOUNDARY)
   ↓
Step 2: UPDATE original entry
```

**Problem:** These are TWO separate database operations with NO transaction wrapper.

---

## 3. Failure Scenarios

### Scenario A: INSERT Succeeds, UPDATE Fails 🔴 CRITICAL

```
Timeline:
1. INSERT cash entry → SUCCESS ✅
   Database: Cash entry created
   
2. UPDATE original entry → FAIL ❌
   - Network timeout
   - Database connection lost
   - RLS policy failure
   - Constraint violation

Result:
✅ Cash entry exists (money recorded as received/paid)
❌ Original credit entry NOT updated
   - remaining_amount unchanged
   - settled = false
   - settled_at = null

Impact:
🔴 DATA INCONSISTENCY
- Books show cash was received
- But credit entry still shows full amount owed
- User can settle the same credit entry again!
- Double-counting of cash
```

**Example:**

```
Initial State:
- Credit entry: $1000 remaining

After failed settlement of $500:
- Cash entry: +$500 (exists)
- Credit entry: $1000 remaining (unchanged!)

User sees:
- "Still owe $1000" (wrong!)
- But cash was already recorded
- Can click "Settle" again → Another $500 cash entry!
```

---

### Scenario B: INSERT Fails, UPDATE Succeeds 🟡 UNLIKELY

```
Timeline:
1. INSERT cash entry → FAIL ❌
   - Returns error immediately
   - Function returns { success: false }
   
2. UPDATE original entry → NEVER EXECUTED ⏭️
   - Code has `return` on INSERT error (line 86)

Result:
✅ No database inconsistency (early return prevents UPDATE)
✅ Error message shown to user
✅ User can retry

Impact:
🟢 SAFE - No data corruption
```

**Current code prevents this:**

```typescript
if (cashEntryError) {
  console.error("Failed to create cash entry for settlement", cashEntryError);
  return { success: false, error: cashEntryError.message }; // ✅ Early return
}

// UPDATE never runs if INSERT failed
```

---

### Scenario C: Both Succeed 🟢 NORMAL

```
Timeline:
1. INSERT cash entry → SUCCESS ✅
2. UPDATE original entry → SUCCESS ✅

Result:
✅ Cash entry created
✅ Original entry updated
✅ Data consistent

Impact:
🟢 WORKS AS EXPECTED
```

---

### Scenario D: UPDATE Fails Silently (Network Issues) 🔴 CRITICAL

```
Timeline:
1. INSERT cash entry → SUCCESS ✅
   Database commit confirmed
   
2. Server Action continues...
   
3. UPDATE original entry → Starts...
   ↓
   Network connection drops
   ↓
   UPDATE command lost in transit
   ↓
   Server Action crashes/times out
   ↓
   No error returned to client

Result:
✅ Cash entry exists
❌ Original entry unchanged
❌ User sees generic error (or timeout)
❌ No way to know which operation failed

Impact:
🔴 SILENT DATA CORRUPTION
- User doesn't know if settlement worked
- Might retry → Double cash entry
- Or assume it worked → Wrong reports
```

---

## 4. Error Handling Analysis

### Current Error Handling:

```typescript
// ✅ Validates amount
if (settledAmount <= 0) {
  return { success: false, error: "..." };
}

// ✅ Checks auth
if (!user) {
  return { success: false, error: "..." };
}

// ✅ Validates entry type
if (latestEntry.entry_type !== "Credit" && latestEntry.entry_type !== "Advance") {
  return { success: false, error: "..." };
}

// ✅ Checks remaining amount
if (settledAmount > remainingAmount) {
  return { success: false, error: "..." };
}

// ⚠️ PARTIAL: Handles INSERT error
if (cashEntryError) {
  return { success: false, error: cashEntryError.message };
}

// ❌ PROBLEM: Handles UPDATE error but INSERT already committed!
if (updateError) {
  console.error("Failed to update entry with settlement info", updateError);
  return { success: false, error: updateError.message }; // ❌ Too late! Cash entry exists
}

// ⚠️ GENERIC: Catches unexpected errors
catch (error) {
  return { success: false, error: "..." };
}
```

### What's Missing:

1. ❌ **No rollback mechanism**
   - If UPDATE fails, INSERT is not reversed
   - No way to undo the cash entry

2. ❌ **No transaction wrapper**
   - Operations are not atomic
   - Can't ensure all-or-nothing

3. ❌ **No compensation logic**
   - If UPDATE fails, should delete the cash entry
   - But no code to do this

4. ❌ **No idempotency**
   - User can retry after partial failure
   - Creates duplicate cash entries

5. ❌ **No audit trail**
   - Can't tell if partial failure occurred
   - No way to detect/fix inconsistent state

---

## 5. Rollback Status: ❌ NO ROLLBACK

**Current behavior:**

```typescript
// INSERT succeeds
const { error: cashEntryError } = await supabase.from("entries").insert({...});

if (cashEntryError) {
  // ✅ No cash entry created, safe to return error
  return { success: false, error: cashEntryError.message };
}

// ⚠️ POINT OF NO RETURN - Cash entry is now in database

// UPDATE fails
const { error: updateError } = await supabase.from("entries").update({...});

if (updateError) {
  // ❌ PROBLEM: Cash entry still exists!
  // ❌ No rollback, no compensation
  return { success: false, error: updateError.message };
}
```

**What should happen:**

```typescript
// If UPDATE fails, need to:
1. Delete the cash entry that was just created
2. OR use a transaction that rolls back both
3. OR mark the settlement as "pending" for manual review
```

---

## 6. Solutions

### Option 1: Supabase RPC with PostgreSQL Transaction (BEST) ✅

Create a PostgreSQL stored procedure that wraps both operations in a transaction.

**Create Migration:**

```sql
-- supabase/migrations/create_settle_entry_function.sql

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
  
  -- 1. Load and validate entry
  SELECT * INTO v_entry
  FROM entries
  WHERE id = p_entry_id
    AND user_id = p_user_id
  FOR UPDATE; -- Lock row for update
  
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
  
  -- 3. Calculate remaining amount
  v_remaining_amount := COALESCE(v_entry.remaining_amount, v_entry.amount);
  
  IF p_settlement_amount > v_remaining_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Settlement amount exceeds remaining balance'
    );
  END IF;
  
  -- 4. For Credit entries, create cash entry
  IF v_entry.entry_type = 'Credit' THEN
    v_is_inflow := (v_entry.category = 'Sales');
    v_settlement_payment_method := CASE
      WHEN v_entry.payment_method IN ('Cash', 'Bank') THEN v_entry.payment_method
      ELSE 'Cash'
    END;
    
    INSERT INTO entries (
      user_id,
      entry_type,
      category,
      payment_method,
      amount,
      remaining_amount,
      entry_date,
      notes
    ) VALUES (
      p_user_id,
      CASE WHEN v_is_inflow THEN 'Cash Inflow' ELSE 'Cash Outflow' END,
      v_entry.category,
      v_settlement_payment_method,
      p_settlement_amount,
      p_settlement_amount,
      p_settlement_date,
      'Settlement of credit ' || LOWER(v_entry.category) || ' (' || v_entry.id || ')'
    );
  END IF;
  
  -- 5. Update original entry
  v_next_remaining := v_remaining_amount - p_settlement_amount;
  v_is_fully_settled := (v_next_remaining <= 0);
  
  UPDATE entries
  SET
    remaining_amount = v_next_remaining,
    settled = v_is_fully_settled,
    settled_at = CASE WHEN v_is_fully_settled THEN p_settlement_date ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_entry_id
    AND user_id = p_user_id;
  
  -- 6. Success - transaction will auto-commit
  RETURN json_build_object(
    'success', true
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Auto-rollback on any error
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION settle_entry TO authenticated;
```

**Update Server Action:**

```typescript
export async function createSettlement(
  entryId: string,
  amount: number,
  settlementDate: string
): Promise<SettleEntryResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const settledAmount = normalizeAmount(amount, 0);

    if (settledAmount <= 0) {
      return { success: false, error: "Settlement amount must be greater than zero." };
    }

    const { user, initialError } = await getOrRefreshUser(supabase);

    if (!user) {
      console.error(`[Auth Fail] No user in settlements/createSettlement`);
      return { success: false, error: "You must be signed in to settle entries." };
    }

    // ✅ Call RPC function (atomic transaction)
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

    // Parse JSON response from function
    const result = data as { success: boolean; error?: string };
    
    if (!result.success) {
      return { success: false, error: result.error || "Settlement failed" };
    }

    revalidatePath("/daily-entries");
    revalidatePath("/cashpulse");
    revalidatePath("/profit-lens");

    return { success: true };
  } catch (error) {
    console.error("Failed to settle entry", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to settle entry.",
    };
  }
}
```

**Benefits:**

- ✅ **Atomic:** Both INSERT and UPDATE succeed or both fail
- ✅ **Automatic rollback:** PostgreSQL handles rollback on error
- ✅ **Row locking:** `FOR UPDATE` prevents concurrent settlements
- ✅ **Server-side validation:** All logic in database
- ✅ **Performance:** Single round-trip to database
- ✅ **Consistency:** No partial failures possible

---

### Option 2: Compensating Transaction (MANUAL ROLLBACK) ⚠️

If you can't use RPC, manually rollback the INSERT if UPDATE fails.

```typescript
// OPERATION 1: INSERT cash entry
let cashEntryId: string | null = null;

if (latestEntry.entry_type === "Credit") {
  const { data: cashEntry, error: cashEntryError } = await supabase
    .from("entries")
    .insert({
      // ... same fields ...
    })
    .select("id")
    .single();

  if (cashEntryError) {
    console.error("Failed to create cash entry", cashEntryError);
    return { success: false, error: cashEntryError.message };
  }

  cashEntryId = cashEntry.id; // ✅ Save ID for potential rollback
}

// OPERATION 2: UPDATE original entry
const { error: updateError } = await supabase
  .from("entries")
  .update({
    remaining_amount: nextRemainingAmount,
    settled: isFullySettled,
    settled_at: isFullySettled ? settlementDate : null,
  })
  .eq("id", latestEntry.id)
  .eq("user_id", user.id);

if (updateError) {
  console.error("Failed to update entry, rolling back cash entry", updateError);
  
  // ✅ ROLLBACK: Delete the cash entry we just created
  if (cashEntryId) {
    const { error: deleteError } = await supabase
      .from("entries")
      .delete()
      .eq("id", cashEntryId)
      .eq("user_id", user.id);
    
    if (deleteError) {
      // 🔴 CRITICAL: Rollback failed!
      console.error("CRITICAL: Failed to rollback cash entry", deleteError);
      // Consider alerting admin or logging to monitoring system
    }
  }
  
  return { success: false, error: updateError.message };
}
```

**Issues:**

- ⚠️ **Not truly atomic:** Rollback is a separate operation
- ⚠️ **Rollback can fail:** What if DELETE fails?
- ⚠️ **Race condition:** Another process might see cash entry before it's deleted
- ⚠️ **Complex:** More code, more failure points
- ⚠️ **Realtime events:** Will broadcast INSERT then DELETE (confusing)

---

### Option 3: Idempotency Key 🔑

Add idempotency to prevent duplicate settlements on retry.

```typescript
// Add to function signature
export async function createSettlement(
  entryId: string,
  amount: number,
  settlementDate: string,
  idempotencyKey?: string // ✅ Optional idempotency key
): Promise<SettleEntryResult> {
  // ... existing validation ...
  
  // Check if this settlement was already processed
  if (idempotencyKey) {
    const { data: existingSettlement } = await supabase
      .from("settlement_operations")
      .select("result")
      .eq("idempotency_key", idempotencyKey)
      .eq("user_id", user.id)
      .single();
    
    if (existingSettlement) {
      // ✅ Return cached result (don't process again)
      return JSON.parse(existingSettlement.result);
    }
  }
  
  // ... proceed with settlement ...
  
  // Store result with idempotency key
  if (idempotencyKey) {
    await supabase.from("settlement_operations").insert({
      idempotency_key: idempotencyKey,
      user_id: user.id,
      entry_id: entryId,
      result: JSON.stringify({ success: true }),
    });
  }
  
  return { success: true };
}
```

**Requires new table:**

```sql
CREATE TABLE settlement_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entry_id UUID NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(idempotency_key, user_id)
);
```

**Benefits:**

- ✅ Prevents duplicate settlements on retry
- ✅ Client can safely retry
- ✅ Good for network issues

**Limitations:**

- ❌ Doesn't solve atomicity problem
- ❌ Still can have partial failures
- ❌ Requires additional table

---

## 7. Recommendation

### ✅ Use Option 1: Supabase RPC with PostgreSQL Transaction

**Why:**

1. **Truly atomic** - PostgreSQL guarantees all-or-nothing
2. **Automatic rollback** - No manual compensation needed
3. **Row locking** - Prevents concurrent settlements on same entry
4. **Single round-trip** - Better performance
5. **Database-enforced** - Can't be bypassed by buggy client code
6. **Standard practice** - How financial systems handle transactions

**Implementation Steps:**

1. Create migration file with `settle_entry` function
2. Update Server Action to call `supabase.rpc('settle_entry', ...)`
3. Test thoroughly:
   - Normal settlement
   - Partial settlement
   - Full settlement
   - Concurrent settlements
   - Network failures

**Testing:**

```typescript
// Test concurrent settlements
const promise1 = createSettlement(entryId, 500, "2024-01-15");
const promise2 = createSettlement(entryId, 500, "2024-01-15");

await Promise.all([promise1, promise2]);

// Expected: One succeeds, one fails with "insufficient remaining balance"
// Without transaction: Both might succeed (double settlement!)
```

---

## 8. Summary

| Aspect | Status | Risk |
|--------|--------|------|
| **Atomicity** | ❌ NO | 🔴 High |
| **Rollback** | ❌ NO | 🔴 High |
| **Error Handling** | ⚠️ Partial | 🟡 Medium |
| **Idempotency** | ❌ NO | 🟡 Medium |
| **Data Consistency** | ⚠️ At Risk | 🔴 High |

### Failure Scenarios:

| Scenario | Current Behavior | Impact |
|----------|------------------|--------|
| INSERT succeeds, UPDATE fails | Cash entry orphaned | 🔴 Data corruption |
| INSERT fails, UPDATE succeeds | ✅ Prevented by early return | 🟢 Safe |
| Network timeout after INSERT | Unknown state | 🔴 Silent corruption |
| Concurrent settlements | Both might succeed | 🔴 Double settlement |

### Recommended Fix:

**Priority:** 🔴 **CRITICAL**

**Solution:** Implement Option 1 (Supabase RPC with transaction)

**Files to Create:**
1. `supabase/migrations/YYYYMMDD_create_settle_entry_function.sql`
2. Update `app/settlements/actions.ts` to use RPC

**Benefits:**
- ✅ Atomic operations
- ✅ Automatic rollback
- ✅ Row locking
- ✅ Data consistency guaranteed

---

## 9. Current Deployment Status

⚠️ **WARNING:** Current code is deployed WITHOUT transaction support

**Risk Level:** 🔴 **HIGH**

**Recommendation:** Deploy transaction fix ASAP

**Until Fixed:**
- Users might experience data inconsistencies
- Settlement failures could leave orphaned cash entries
- Manual data cleanup might be needed
- Consider adding monitoring for orphaned entries
