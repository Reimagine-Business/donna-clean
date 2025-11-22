# Concurrent Operations Analysis: Race Conditions & Conflicts

## Executive Summary

**Finding:** There are NO `Promise.all()` or intentional concurrent operations in the new features. However, there ARE **unintentional race conditions** that cause conflicts!

---

## 1. Automatic Triggers

### ❌ NO Automatic Settlement Triggers

**Finding:** Settlements are ONLY triggered manually by user clicking "Settle" button.

**Code Evidence:**
```typescript
// settle-entry-dialog.tsx - Manual trigger only
const handleConfirm = async () => {
  // User explicitly clicks "Confirm" button
  const result = await createSettlement({ ... });
};
```

**Status:** ✅ No issues here

---

## 2. Multiple Table Updates

### ❌ NO Multiple Tables - Single `entries` Table

**Finding:** All operations (credit, advance, settlement) use the SAME `entries` table.

**Status:** ✅ No cross-table conflicts

---

## 3. Parallel Supabase Queries

### ❌ NO `Promise.all()` - But Sequential Operations

**Finding:** Settlements use SEQUENTIAL database operations (not parallel):

```typescript
// lib/settlements.ts (LINES 75-111)

// Operation 1: INSERT new cash entry (if Credit)
if (latestEntry.entry_type === "Credit") {
  const { error: cashEntryError } = await supabase.from("entries").insert({
    user_id: user.id,
    entry_type: isInflow ? "Cash Inflow" : "Cash Outflow",
    // ... more fields
  });
  
  if (cashEntryError) {
    return { success: false, error: cashEntryError.message };
  }
}

// Operation 2: UPDATE original entry
const { error: updateError } = await supabase
  .from("entries")
  .update({
    remaining_amount: nextRemainingAmount,
    settled: isFullySettled,
    settled_at: isFullySettled ? settlementDate : null,
  })
  .eq("id", latestEntry.id);

if (updateError) {
  return { success: false, error: updateError.message };
}
```

**Analysis:**
- ✅ NOT parallel (no `Promise.all()`)
- ⚠️ BUT: No transaction support
- ⚠️ If INSERT succeeds but UPDATE fails → **partial corruption**
- ⚠️ Between INSERT and UPDATE, JWT could expire

**Status:** 🟡 Sequential but vulnerable to timing issues

---

## 4. Optimistic Updates

### 🔴 FOUND: Implicit Optimistic Updates via Realtime

**Finding:** There's a subtle race condition between:
1. Settlement operation (client-side)
2. Realtime subscription (client-side)
3. Manual data refetch

#### The Race Condition:

**Scenario A: Settlement on Daily Entries Page**

```
Timeline:

T0: User clicks "Settle" on Credit entry
    ↓
T1: createSettlement() called
    → INSERT new cash entry
    → UPDATE credit entry
    ↓
T2: INSERT completes → Realtime broadcasts INSERT event
    ↓
T3: Daily Entries Realtime handler receives INSERT
    → Calls setEntries((prev) => [newEntry, ...prev])
    ↓
T4: UPDATE completes → Realtime broadcasts UPDATE event
    ↓
T5: Daily Entries Realtime handler receives UPDATE
    → Calls setEntries((prev) => prev.map(...))
    ↓
T6: Settlement completes → router.refresh() called
    → Makes new HTTP request
    → Fetches ALL entries from server
    → Overwrites local state
    ↓
T7: Component re-renders with server data
```

**Problem:** Steps T2-T5 are updating local state while settlement is still in progress!

#### The Code:

**Daily Entries Realtime Handler:**
```typescript
// daily-entries-shell.tsx (LINES 143-163)
.on("postgres_changes", { event: "*" }, (payload) => {
  setEntries((prev) => {
    switch (payload.eventType) {
      case "INSERT": {
        const newEntry = normalizeEntry(payload.new);
        if (prev.some((e) => e.id === newEntry.id)) {
          // ⚠️ Duplicate prevention
          return prev.map((entry) => (entry.id === newEntry.id ? newEntry : entry));
        }
        return [newEntry, ...prev];  // ⚠️ Optimistic add
      }
      case "UPDATE": {
        const updated = normalizeEntry(payload.new);
        return prev.map((entry) => (entry.id === updated.id ? updated : entry));  // ⚠️ Optimistic update
      }
      case "DELETE": {
        const deletedId = (payload.old as Entry).id;
        return prev.filter((entry) => entry.id !== deletedId);
      }
      default:
        return prev;
    }
  });
});
```

**Cashpulse/Profit Lens Realtime Handler:**
```typescript
// cashpulse-shell.tsx (LINES 207-214)
async (payload) => {
  console.log("REAL-TIME: payload received", payload);
  const latestEntries = await refetchEntries();  // ⚠️ Fetches ALL entries
  if (!latestEntries) {
    return;
  }
  const updatedStats = recalcKpis(latestEntries);  // ⚠️ Recalculates KPIs
  // ...
}
```

**Status:** 🔴 RACE CONDITION FOUND!

---

## 5. Race Condition Details

### Scenario 1: Settlement Creates TWO Realtime Events

**Settlement of Credit Entry:**

1. **INSERT** new Cash Inflow entry → Triggers Realtime event #1
2. **UPDATE** original Credit entry → Triggers Realtime event #2

**If user is on Daily Entries page:**

```
User State:
  entries = [Credit1, Cash1, Cash2, ...]

Settlement Operation:
  INSERT Cash3 (settlement payment)
  UPDATE Credit1 (mark as settled)

Realtime Event #1 (INSERT Cash3):
  setEntries([Cash3, Credit1, Cash1, Cash2, ...])
  ✅ Cash3 added

Realtime Event #2 (UPDATE Credit1):
  setEntries([Cash3, Credit1_updated, Cash1, Cash2, ...])
  ✅ Credit1 updated

Settlement Completes:
  router.refresh() called
  ↓ New HTTP request
  ↓ Server returns ALL entries
  ↓ State overwritten with server data
  
Result:
  State updated 3 times for 1 settlement!
  ⚠️ Potential for stale data if timing is off
```

### Scenario 2: Settlement + Edit Conflict

**If user edits entry while settlement is processing:**

```
T0: User clicks "Settle" on Credit1
    ↓
T1: Settlement starts (client-side)
    → Loading entry data
    ↓
T2: User quickly edits a different entry (Entry2)
    → Direct client-side UPDATE
    ↓
T3: Entry2 UPDATE completes → Realtime broadcasts
    ↓
T4: Realtime handler updates state
    → setEntries([Entry2_updated, ...])
    ↓
T5: Settlement INSERT completes → Realtime broadcasts
    ↓
T6: Realtime handler updates state
    → setEntries([NewCash, Entry2_updated, ...])
    ↓
T7: Settlement UPDATE completes → Realtime broadcasts
    ↓
T8: Realtime handler updates state
    → setEntries([NewCash, Entry2_updated, Credit1_updated, ...])
    ↓
T9: Settlement router.refresh() called
    ↓
T10: Server data overwrites local state
```

**Problem:** Multiple setState operations happening rapidly, each reading from previous state.

### Scenario 3: Edit Uses Client-Side UPDATE (No Server Action!)

**CRITICAL FINDING:**

```typescript
// daily-entries-shell.tsx (LINES 294-298)
if (editingEntryId) {
  const { error } = await supabase.from("entries").update(payload).eq("id", editingEntryId);
  if (error) throw error;
  setSuccessMessage("Entry updated!");
} else {
  const result = await addEntryAction(payload);  // ← Server Action
  // ...
}
```

**Analysis:**
- ✅ NEW entries use Server Action
- ❌ EDIT operations use **CLIENT-SIDE UPDATE**
- ⚠️ Same pattern as settlements!
- ⚠️ Vulnerable to stale session
- ⚠️ Can trigger RLS failures

**Status:** 🔴 EDIT OPERATIONS ALSO VULNERABLE!

---

## 6. Race Condition: Cashpulse/Profit Lens Refetch

### The `skipNextRecalc` Pattern

**Both Cashpulse and Profit Lens have this pattern:**

```typescript
// cashpulse-shell.tsx (LINES 106-126)
const refetchEntries = useCallback(async () => {
  try {
    const { data, error } = await supabase
      .from("entries")
      .select(ENTRY_SELECT)
      .eq("user_id", userId)
      .order("entry_date", { ascending: false });

    if (error) {
      throw error;
    }

    const nextEntries = data?.map((entry) => normalizeEntry(entry)) ?? [];
    skipNextRecalc.current = true;  // ⚠️ Set flag
    setEntries(nextEntries);        // ⚠️ Update entries
    return nextEntries;
  } catch (error) {
    console.error("Failed to refetch entries for Cashpulse", error);
    return undefined;
  }
}, [supabase, userId]);

// Later in useEffect:
useEffect(() => {
  if (skipNextRecalc.current) {
    skipNextRecalc.current = false;  // ⚠️ Check flag
    return;                           // Skip recalc
  }
  recalcKpis(entries, historyFilters);  // Normal recalc
}, [entries, historyFilters, recalcKpis]);
```

**The Race Condition:**

```
T0: Realtime event received
    ↓
T1: refetchEntries() called
    → skipNextRecalc.current = true
    → setEntries(newData)
    ↓
T2: entries state updates → triggers useEffect
    ↓
T3: useEffect checks skipNextRecalc.current
    → if (skipNextRecalc.current) return;
    ↓
T4: skipNextRecalc.current = false
```

**Problem:** If another Realtime event arrives DURING T1-T3:

```
T1: refetchEntries() #1 called
    → skipNextRecalc.current = true
    → setEntries(data1)
    ↓
T1.5: ⚠️ SECOND Realtime event arrives
      → refetchEntries() #2 called
      → skipNextRecalc.current = true (already true!)
      → setEntries(data2)
      ↓
T2: First useEffect triggered (data1)
    → Checks skipNextRecalc.current (true)
    → Sets skipNextRecalc.current = false
    → Returns (skips recalc)
    ↓
T3: Second useEffect triggered (data2)
    → Checks skipNextRecalc.current (false!) ⚠️
    → Runs recalcKpis() when it should skip!
```

**Status:** 🟡 Potential race, but unlikely to cause major issues

---

## 7. Settlement + Realtime Conflict

### The Critical Race:

**Settlement creates TWO DB operations:**

1. INSERT (creates Realtime event)
2. UPDATE (creates Realtime event)

**If Realtime is subscribed (Daily Entries, Cashpulse, Profit Lens):**

```
Settlement Thread:
  INSERT Cash3 → Event1 queued
  UPDATE Credit1 → Event2 queued
  router.refresh()

Realtime Thread:
  Event1 arrives → setEntries()
  Event2 arrives → setEntries()

Router Refresh Thread:
  Makes HTTP request
  Fetches all entries
  Overwrites state
```

**All three threads are updating the SAME state!**

### Potential Outcome:

1. **Best case:** All updates happen in order, final state is correct ✅
2. **Likely case:** State updates multiple times, causing flicker
3. **Worst case:** 
   - Realtime event arrives with stale data
   - Router refresh overwrites with correct data
   - Another Realtime event arrives late
   - **Final state is stale!** ❌

---

## 8. Edit Operations - Same Vulnerability as Settlements

### CRITICAL: Edit Uses Client-Side Update

```typescript
// daily-entries-shell.tsx (LINE 295)
if (editingEntryId) {
  const { error } = await supabase.from("entries").update(payload).eq("id", editingEntryId);
  // ❌ CLIENT-SIDE UPDATE - Same issues as settlements!
}
```

**Problems:**
1. Uses CLIENT Supabase instance
2. Can fail with stale session
3. Triggers RLS policy check with potentially stale `auth.uid()`
4. No `router.refresh()` after edit (good!)
5. But relies on Realtime to update UI

**Race Condition:**

```
T0: User clicks "Save" (edit)
    ↓
T1: Client UPDATE starts
    ↓
T2: UPDATE completes → Realtime broadcasts
    ↓
T3: Realtime handler receives UPDATE
    → setEntries((prev) => prev.map(...))
    → Updates entry in local state
    ↓
T4: Edit form shows success message
    ↓
T5: User quickly edits AGAIN
    → Reads stale `prev` state
    → May overwrite with old data
```

**Status:** 🔴 EDIT OPERATIONS VULNERABLE TO SAME ISSUES!

---

## 9. Summary of Race Conditions

| Operation | Race Condition | Severity | Impact |
|-----------|---------------|----------|--------|
| **Settlement INSERT** | Realtime event updates state before UPDATE completes | 🟡 Medium | State updated twice |
| **Settlement UPDATE** | Realtime event conflicts with router.refresh() | 🟡 Medium | Multiple state updates |
| **Settlement router.refresh()** | Overwrites optimistic Realtime updates | 🟡 Medium | Potential stale data |
| **Settlement + Edit** | Both use client-side operations | 🔴 High | Stale session exposure |
| **Edit UPDATE** | Uses client Supabase, no Server Action | 🔴 High | RLS failure risk |
| **Realtime + refetchEntries** | skipNextRecalc flag race | 🟢 Low | Rare, minor |
| **Multiple Realtime events** | Fast succession can conflict | 🟡 Medium | KPI recalc issues |

---

## 10. No Transaction Support

### Critical Issue: Settlement is NOT Atomic

```typescript
// lib/settlements.ts

// Step 1: INSERT
await supabase.from("entries").insert({ ... });

// Step 2: UPDATE (not in transaction!)
await supabase.from("entries").update({ ... });
```

**Problem:** If Step 1 succeeds but Step 2 fails:
- New cash entry exists ✅
- Original credit entry NOT marked as settled ❌
- **Data inconsistency!**

**Possible Failures Between Steps:**
1. JWT expires
2. `auth.uid()` becomes stale
3. RLS policy fails
4. Network error
5. Database timeout

**Status:** 🔴 CRITICAL - No atomicity guarantee

---

## 11. Recommendations

### High Priority:

1. **Convert settlements to Server Action**
   - Eliminate client-side vulnerability
   - Enable database transactions
   - Consistent with regular entries

2. **Convert edits to Server Action**
   - Remove client-side UPDATE
   - Use same pattern as new entries
   - Eliminate RLS timing issues

3. **Add transaction support for settlements**
   ```sql
   BEGIN;
     INSERT INTO entries (...) VALUES (...);
     UPDATE entries SET ... WHERE id = ...;
   COMMIT;
   ```

4. **Remove router.refresh() from settlement dialog**
   - Let Realtime handle updates
   - Reduce race conditions
   - Faster UI response

### Medium Priority:

5. **Debounce rapid Realtime events**
   - Prevent multiple rapid state updates
   - Reduce flickering
   - Improve performance

6. **Add optimistic update flag**
   - Track which updates are optimistic
   - Reconcile with server data
   - Prevent stale data

### Low Priority:

7. **Improve skipNextRecalc pattern**
   - Use atomic counter instead of boolean
   - Handle multiple rapid refetches
   - More robust

---

## 12. Conclusion

**Main Findings:**

1. ✅ NO `Promise.all()` or intentional parallel operations
2. ❌ BUT: Unintentional race conditions exist:
   - Settlement creates 2 DB ops → 2 Realtime events
   - Edit uses client-side UPDATE (same vulnerability as settlements)
   - Realtime updates conflict with router.refresh()
   - Multiple threads updating same state
   - No transaction support (can partially fail)

3. 🔴 **CRITICAL:** Edit operations have THE SAME vulnerabilities as settlements!
   - Both use client-side Supabase
   - Both can fail with stale sessions
   - Both trigger RLS policy checks
   - Edits are likely more common than settlements

**Root Cause of Auto-Logout:**

1. Settlement OR Edit uses client-side Supabase
2. Session slightly stale
3. RLS policy check fails (`auth.uid()` returns NULL)
4. Database operation denied
5. Supabase invalidates session
6. User logged out

**Recommendation:** Convert BOTH settlements AND edits to use Server Actions for consistency and reliability.
