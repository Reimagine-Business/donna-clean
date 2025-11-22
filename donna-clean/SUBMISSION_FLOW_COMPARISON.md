# Submission Flow Comparison: Regular Entries vs Credit/Advance vs Settlements

## 🔴 CRITICAL FINDING: Different Submission Patterns!

The new features (settlements) use a **completely different submission pattern** than regular entries, which could explain the auto-logout issue!

---

## Side-by-Side Comparison

### 1. Regular Daily Entries (Cash Inflow/Outflow)

**Location:** `components/daily-entries/daily-entries-shell.tsx` → `app/daily-entries/actions.ts`

**Flow:**
```typescript
// CLIENT-SIDE (daily-entries-shell.tsx)
const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  setIsSubmitting(true);
  
  // Upload receipt (if any) using client-side Supabase
  if (receiptFile) {
    uploadedUrl = await uploadReceipt();  // Uses client supabase instance
  }
  
  // Build payload
  const payload = {
    entry_type: selectedEntryType,
    category: formValues.category,
    payment_method: normalizedPaymentMethod,
    amount: numericAmount,
    entry_date: formValues.entry_date,
    notes: formValues.notes || null,
    image_url: uploadedUrl,
  };
  
  // If editing: Direct client-side update
  if (editingEntryId) {
    const { error } = await supabase.from("entries").update(payload).eq("id", editingEntryId);
    if (error) throw error;
  } else {
    // If adding: Use Server Action
    const result = await addEntryAction(payload);  // ← SERVER ACTION
    if (result?.error) {
      throw new Error(result.error);
    }
  }
  
  resetForm();
};
```

**SERVER ACTION (app/daily-entries/actions.ts):**
```typescript
export async function addEntry(data: AddEntryInput) {
  const supabase = await createSupabaseServerClient();  // ← Server client
  
  const { user, initialError } = await getOrRefreshUser(supabase);
  
  if (!user) {
    redirect("/auth/login");  // ← Uses redirect()
  }
  
  // Insert entry
  const { error } = await supabase.from("entries").insert(payload);
  
  if (error) {
    return { error: error.message };
  }
  
  // Revalidate paths
  revalidatePath("/daily-entries");   // ← Server-side revalidation
  revalidatePath("/cashpulse");
  revalidatePath("/profit-lens");
  
  return { success: true };
}
```

**Key Characteristics:**
- ✅ Uses **Server Action** for database insert
- ✅ **Server-side revalidation** via `revalidatePath()`
- ✅ Uses **server Supabase client** for auth check
- ✅ No `router.refresh()` on client
- ⚠️ **BUT: Updates use client-side Supabase directly!**

---

### 2. Credit Entries

**Location:** Same as regular entries (uses same `addEntry` Server Action)

**Flow:** Identical to regular daily entries

**Code Path:**
```typescript
// Uses the SAME Server Action
const result = await addEntryAction(payload);
```

**Key Characteristics:**
- ✅ Uses Server Action
- ✅ Server-side revalidation
- ✅ No difference from regular entries

**Settlement columns are set:**
```typescript
// In Server Action (actions.ts line 54-62):
const shouldTrackRemaining = data.entry_type === "Credit" || data.entry_type === "Advance";

const payload = {
  user_id: user.id,
  entry_type: data.entry_type,
  category: data.category,
  payment_method: entryTypeIsCredit(data.entry_type) ? "None" : data.payment_method,
  amount,
  remaining_amount: shouldTrackRemaining ? amount : null,  // ← Settlement column
  entry_date: data.entry_date,
  notes: data.notes,
  image_url: data.image_url,
};
```

---

### 3. Advance Entries

**Location:** Same as regular entries (uses same `addEntry` Server Action)

**Flow:** Identical to regular daily entries and credit entries

**Key Characteristics:**
- ✅ Uses Server Action
- ✅ Server-side revalidation
- ✅ No difference from regular entries

---

### 4. Settlements (NEW FEATURE)

**Location:** `components/settlement/settle-entry-dialog.tsx` → `lib/settlements.ts`

**Flow:**
```typescript
// CLIENT-SIDE (settle-entry-dialog.tsx)
const handleConfirm = async () => {
  setIsSaving(true);
  setError(null);
  
  try {
    // Call CLIENT-SIDE utility function (NOT a Server Action!)
    const result: SettleEntryResult = await createSettlement({
      supabase,           // ← CLIENT Supabase instance
      entryId: entry.id,
      amount: numericAmount,
      settlementDate,
    });
    
    if (!result.success) {
      setError(result.error);
      return;
    }
    
    router.refresh();   // ← CLIENT-SIDE refresh!
    onClose();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unable to settle entry.");
  }
};
```

**UTILITY FUNCTION (lib/settlements.ts):**
```typescript
export async function createSettlement({
  supabase,  // ← Receives CLIENT Supabase instance
  entryId,
  amount,
  settlementDate,
}: CreateSettlementParams): Promise<SettleEntryResult> {
  // Uses CLIENT Supabase instance for auth check
  const { user, initialError } = await getOrRefreshUser(supabase);
  
  if (!user) {
    // Returns error instead of redirect
    return { success: false, error: "You must be signed in to settle entries." };
  }
  
  // Load entry using CLIENT Supabase
  const latestEntry = await loadLatestEntry(supabase, entryId);
  
  // For Credit settlements: INSERT new cash entry
  if (latestEntry.entry_type === "Credit") {
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
  }
  
  // UPDATE original Credit/Advance entry
  const { error: updateError } = await supabase
    .from("entries")
    .update({
      remaining_amount: nextRemainingAmount,
      settled: isFullySettled,
      settled_at: isFullySettled ? settlementDate : null,
    })
    .eq("id", latestEntry.id);
  
  // Revalidate via API call (client-side)
  await revalidateDashboards();
  
  return { success: true };
}

// REVALIDATION FUNCTION
async function revalidateDashboards() {
  try {
    if (typeof window === "undefined") {
      // Server-side: Use Next.js revalidatePath
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/cashpulse");
      revalidatePath("/profit-lens");
      revalidatePath("/daily-entries");
      return;
    }
    
    // CLIENT-SIDE: Make API call to revalidation endpoint
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: DASHBOARD_PATHS }),
      credentials: "same-origin",
    });
  } catch (error) {
    console.error("Failed to revalidate dashboards", error);
  }
}
```

**Key Characteristics:**
- ⚠️ **NOT a Server Action** - It's a client-side utility function!
- ⚠️ Uses **CLIENT Supabase instance** for ALL database operations
- ⚠️ Calls `getOrRefreshUser()` with CLIENT instance (problematic!)
- ⚠️ Uses `router.refresh()` on client side
- ⚠️ Makes additional fetch to `/api/revalidate` endpoint
- ⚠️ Performs **TWO database operations** (INSERT + UPDATE)

---

## 🔴 Critical Differences

| Feature | Regular Entry | Credit/Advance Entry | Settlement |
|---------|--------------|---------------------|-----------|
| **Uses Server Action?** | ✅ Yes (for insert) | ✅ Yes | ❌ **NO** |
| **Supabase Client Type** | Server (for insert) | Server (for insert) | ❌ **Client** |
| **Auth Check Location** | Server Action | Server Action | ❌ **Client-side** |
| **getOrRefreshUser() with** | Server client | Server client | ❌ **Client client** |
| **Revalidation Method** | Server `revalidatePath()` | Server `revalidatePath()` | ❌ **Client fetch + router.refresh()** |
| **On Auth Fail** | `redirect("/auth/login")` | `redirect("/auth/login")` | ❌ **Returns error** |
| **Database Operations** | 1 (insert or update) | 1 (insert) | ❌ **2 (insert + update)** |
| **Uses router.refresh()?** | ❌ No | ❌ No | ⚠️ **YES** |

---

## ⚠️ THE PROBLEM: `getOrRefreshUser()` with Client Instance

### The Function (lib/supabase/get-user.ts):

```typescript
export async function getOrRefreshUser(
  supabase: SupabaseClient,
): Promise<GetOrRefreshUserResult> {
  // Use getUser() which validates the JWT from the cookie
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  
  // ...
  
  return {
    user,
    wasInitiallyNull: !user,
    initialError: error ?? null,
    refreshError: null,
    didRefresh: false,
    isEmailVerified,
  };
}
```

**This function was designed for SERVER contexts!**

When called from client with a client Supabase instance:
1. Client instance reads cookies from browser
2. If cookies are stale/corrupted → `getUser()` fails
3. No refresh happens (we removed client-side refresh)
4. Returns `user: null`
5. Settlement fails with error
6. But session is already corrupted!

---

## 🔥 The Auto-Logout Cascade

### Scenario: User Settles a Credit Entry

**Step 1: User clicks "Settle"**
- Settlement dialog opens
- Uses CLIENT Supabase instance (`useMemo(() => createClient(), [])`)

**Step 2: Settlement submission**
- Calls `createSettlement()` with CLIENT instance
- `getOrRefreshUser(clientSupabase)` called
- If session is even slightly stale → returns `null`
- **BUT**: The database operations might still execute if session is "stale but not expired"

**Step 3: Database operations**
- First INSERT: New cash entry
  - RLS policy checks `auth.uid() = user_id`
  - If JWT is stale: `auth.uid()` might return `NULL`
  - **RLS policy FAILS** → Operation denied
- Or: INSERT succeeds but UPDATE fails
- Result: **Partial data corruption** OR **Complete failure**

**Step 4: On RLS failure**
- Supabase sees auth failure
- Invalidates the session entirely
- **User logged out**

**Step 5: Even if operations succeed**
- `router.refresh()` called
- Makes new request with stale cookies
- Middleware can't fix it (Server Action no-op prevents cookie update)
- Next operation fails

---

## 🎯 Root Cause Analysis

### Why Settlements Cause Logout:

1. **Settlement uses CLIENT-SIDE database operations**
   - Should use Server Action like regular entries
   - Client operations are vulnerable to stale sessions

2. **`getOrRefreshUser()` called with CLIENT instance**
   - This function assumes SERVER context
   - Can't refresh session on client
   - Returns null if session is stale

3. **TWO database operations instead of one**
   - More chances for `auth.uid()` to be stale
   - If first succeeds but second fails → partial data corruption

4. **`router.refresh()` after operations**
   - Makes new request with potentially corrupted cookies
   - Can trigger full session invalidation

5. **Client fetch to `/api/revalidate`**
   - Additional HTTP request that could expose stale session

### Why Regular Entries Work:

1. ✅ Uses **Server Action**
2. ✅ Server-side auth check with **server client**
3. ✅ Server-side revalidation
4. ✅ No `router.refresh()`
5. ✅ Single database operation

---

## 🔧 Recommended Fix

### Option 1: Convert Settlement to Server Action (BEST)

```typescript
// Create: app/settlements/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getOrRefreshUser } from "@/lib/supabase/get-user";

export async function settleEntry(
  entryId: string,
  amount: number,
  settlementDate: string
) {
  const supabase = await createSupabaseServerClient();  // ← Server client
  
  const { user, initialError } = await getOrRefreshUser(supabase);
  
  if (!user) {
    return { success: false, error: "You must be signed in to settle entries." };
  }
  
  // ... settlement logic ...
  
  // Server-side revalidation
  revalidatePath("/daily-entries");
  revalidatePath("/cashpulse");
  revalidatePath("/profit-lens");
  
  return { success: true };
}
```

**Update client component:**
```typescript
// settle-entry-dialog.tsx
const handleConfirm = async () => {
  const result = await settleEntryAction(entry.id, numericAmount, settlementDate);
  
  if (!result.success) {
    setError(result.error);
    return;
  }
  
  // No router.refresh() needed - Server Action handles it
  onClose();
};
```

### Option 2: Keep Client-Side but Add Protection

If you must keep client-side operations:

1. **Remove `getOrRefreshUser()` call**
   - Just use `supabase.auth.getUser()` directly
   - Don't try to refresh on client

2. **Remove `router.refresh()`**
   - Let Realtime handle updates
   - Or use Server Action for revalidation

3. **Add transaction support**
   - Use database transactions for INSERT + UPDATE
   - Prevent partial failures

---

## 📊 Summary Table

| Issue | Regular Entries | Settlements | Risk Level |
|-------|----------------|-------------|-----------|
| Uses client Supabase for auth | ❌ No | ⚠️ **YES** | 🔴 High |
| Calls getOrRefreshUser with client | ❌ No | ⚠️ **YES** | 🔴 High |
| Multiple DB operations | ❌ No (1 op) | ⚠️ **YES (2 ops)** | 🟡 Medium |
| Uses router.refresh() | ❌ No | ⚠️ **YES** | 🟡 Medium |
| Makes additional API calls | ❌ No | ⚠️ **YES** | 🟡 Medium |
| Can partially fail | ❌ No | ⚠️ **YES** | 🔴 High |

**Total Risk: 🔴 VERY HIGH**

---

## 🎯 Conclusion

**The settlement feature is the ONLY feature that:**
1. Uses client-side Supabase for database operations
2. Calls `getOrRefreshUser()` with a client instance
3. Performs multiple database operations sequentially
4. Uses `router.refresh()` after operations

**This is why the auto-logout started AFTER settlements were added!**

The combination of:
- Client-side auth checks
- Multiple DB operations
- Stale session vulnerability
- RLS policies checking `auth.uid()`

...creates a perfect storm where any slight session staleness causes:
1. RLS policy failures
2. Database operation denials
3. Session invalidation
4. Auto-logout

**Recommendation:** Convert settlements to use Server Actions like regular entries. This is the safest and most consistent approach.
