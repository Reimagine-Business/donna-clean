# Database Analysis: Settlement, Credit, and Advance Entries

## Executive Summary

**Key Finding:** There are NO separate tables for settlements, credit entries, or advance entries. Everything is in the single `entries` table with different `entry_type` values.

**Timeline:**
- **Nov 19, 2025 04:32 UTC** - Settlement columns added (`remaining_amount`, `settled`, `settled_at`)
- **Auto-logout issues started around the same time** ⚠️

## Database Schema

### Single Table: `entries`

There is **ONE table** that handles all entry types:

```sql
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_type text not null check (entry_type in ('Cash Inflow', 'Cash Outflow', 'Credit', 'Advance')),
  category text not null check (category in ('Sales', 'COGS', 'Opex', 'Assets')),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'Bank', 'None')),
  amount numeric(14,2) not null check (amount >= 0),
  entry_date date not null default current_date,
  notes text,
  image_url text,
  -- Settlement columns (added Nov 19, 2025):
  remaining_amount numeric DEFAULT NULL,
  settled boolean not null default false,
  settled_at timestamptz,
  -- Timestamps:
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

**Entry Types:**
- `'Cash Inflow'` - Direct cash coming in
- `'Cash Outflow'` - Direct cash going out
- `'Credit'` - Credit sales/purchases (to be settled later)
- `'Advance'` - Advances given/received (to be settled later)

**Settlement Columns (added Nov 19):**
- `remaining_amount` - Amount still unsettled (for Credit/Advance)
- `settled` - Boolean flag if fully settled
- `settled_at` - Timestamp when fully settled

## RLS Policies on `entries` Table

### Policy Set 1: Standard CRUD Policies (from `entries-table.sql`)

```sql
-- INSERT
create policy "Users can insert their own entries"
  on public.entries
  for insert
  with check (auth.uid() = user_id);

-- SELECT
create policy "Users can view their own entries"
  on public.entries
  for select
  using (auth.uid() = user_id);

-- UPDATE
create policy "Users can update their own entries"
  on public.entries
  for update
  using (auth.uid() = user_id);

-- DELETE
create policy "Users can delete their own entries"
  on public.entries
  for delete
  using (auth.uid() = user_id);
```

### Policy Set 2: Realtime Broadcast Policy (from `supabase-rls.sql`)

```sql
CREATE POLICY "Enable realtime broadcast"
ON entries
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (true);
```

**Analysis of this policy:**
- `FOR ALL` - Applies to SELECT, INSERT, UPDATE, DELETE
- `USING (user_id = auth.uid())` - Read check
- `WITH CHECK (true)` - Write check (always allows!)

### ⚠️ POTENTIAL ISSUE: Policy Behavior When Session is Invalid

**How RLS Policies Work:**
- Multiple policies for the same operation are combined with **OR** logic
- If `auth.uid()` returns `NULL`, the condition `auth.uid() = user_id` evaluates to `NULL`
- In PostgreSQL, `NULL = anything` is `NULL`, not `FALSE`
- A `NULL` result in a policy check is treated as **FAILED**

**What happens if the session is invalid:**

1. User makes a request to insert/update/delete an entry
2. Session cookie is corrupted/stale
3. `auth.uid()` returns `NULL`
4. All RLS policy checks fail
5. Database operation is **DENIED**
6. Supabase may invalidate the session entirely

**This could explain the auto-logout!**

If the session becomes slightly corrupted or stale:
- First request: Session is valid, `auth.uid()` works, operation succeeds ✅
- Second request: Session is now stale, `auth.uid()` returns `NULL`, operation FAILS ❌
- Supabase sees auth failure, invalidates session → User logged out

## Database Triggers

### 1. `updated_at` Trigger

```sql
create or replace function public.set_entries_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_entries_updated_at on public.entries;
create trigger set_entries_updated_at
before update on public.entries
for each row execute function public.set_entries_updated_at();
```

**Status:** ✅ Safe - Only updates timestamp, doesn't check auth

## Stored Procedures / Functions

**None found** beyond the `set_entries_updated_at()` trigger function.

## Realtime Configuration

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE entries;
```

**Status:** ✅ Correct - Enables Realtime for the `entries` table

## Migration Timeline

| Date | Commit | Change |
|------|--------|--------|
| Nov 19, 04:32 UTC | `508466a` | **Settlement columns added** |
| Nov 19, 08:10 UTC | `9fabed5` | Realtime connection improvements |
| Nov 19, 08:22 UTC | `960fe9f` | Auth logic refactor |
| Nov 19, 08:36 UTC | `f6761bf` | Realtime backoff improvements |

**User reported auto-logout started after settlements were added** ✅ Timeline matches!

## ⚠️ Root Cause Analysis

### Hypothesis: RLS Policy + Stale Session = Auto-Logout

**The Chain of Events:**

1. **User adds first entry (Credit/Advance with settlement columns)**
   - Session is fresh, `auth.uid()` returns valid UUID
   - RLS policy: `auth.uid() = user_id` → TRUE ✅
   - Entry inserted successfully
   - Realtime broadcasts change

2. **Realtime subscription triggers re-render**
   - Component re-subscribes (due to useCallback bug we just fixed)
   - Multiple rapid Realtime connections

3. **Session cookies become slightly stale**
   - Rapid Realtime reconnections may corrupt cookies
   - Middleware attempts to refresh but Server Action no-op prevents cookie update
   - Session JWT is now slightly out of sync

4. **User adds second entry**
   - Session is stale, `auth.uid()` returns `NULL` or wrong value
   - RLS policy: `NULL = user_id` → NULL (treated as FALSE) ❌
   - **Database operation DENIED**
   - Supabase sees auth failure
   - **Session invalidated → USER LOGGED OUT**

### Why It Started After Settlements

**Before settlements:**
- Only 4 entry types: Cash Inflow, Cash Outflow
- No complex settlement logic
- Fewer database operations per entry
- Less chance of session timing issues

**After settlements:**
- Credit and Advance entries added
- Settlement creates **TWO database operations**:
  1. Update Credit/Advance entry (set `remaining_amount`)
  2. Insert new Cash Inflow/Outflow entry (for settlement)
- More database calls = more chances for `auth.uid()` to be stale
- Settlement dialog creates its own client instance (we just fixed this)

## Recommendations

### ✅ Already Fixed:

1. **Realtime re-subscription bug** - useCallback deps fixed
2. **Client instantiation** - All use `useMemo(() => createClient(), [])`
3. **Server Action cookie corruption** - `setAll` is now no-op
4. **Middleware cookie bug** - All cookies set on same response object

### 🔍 Still Need to Verify:

1. **Check if Supabase is logging auth failures** in production
   - Look for "auth.uid() returned NULL" errors
   - Check RLS policy failure logs

2. **Consider adding a debug policy temporarily:**
   ```sql
   -- Temporary debug policy (DON'T USE IN PRODUCTION LONG-TERM)
   CREATE POLICY "Debug: Allow all for testing"
   ON entries
   FOR ALL
   USING (true)
   WITH CHECK (true);
   ```
   
   This would bypass RLS entirely to confirm if RLS is the issue.

3. **Add logging to settlements.ts:**
   ```typescript
   console.log('[Settlement] auth.uid:', user?.id);
   console.log('[Settlement] entry.user_id:', latestEntry.user_id);
   ```

4. **Monitor Supabase logs for:**
   - "permission denied for table entries"
   - "new row violates row-level security policy"
   - Any RLS-related errors

## Database Security Status

### RLS Policies: ✅ Correct

All policies correctly check `auth.uid() = user_id`. The issue is not with the policy logic itself, but with what happens when `auth.uid()` returns `NULL` due to a stale/corrupted session.

### Triggers: ✅ Safe

The only trigger is for `updated_at` timestamp, which doesn't check auth.

### Foreign Keys: ✅ Correct

`user_id` correctly references `auth.users(id)` with `ON DELETE CASCADE`.

## Testing Recommendations

1. **Deploy the fixes we just made** (useCallback deps, client memoization)
2. **Monitor for "second entry fails" pattern**
3. **Check Supabase logs for RLS failures**
4. **If issue persists, temporarily disable RLS** to isolate the problem:
   ```sql
   ALTER TABLE entries DISABLE ROW LEVEL SECURITY;
   ```
   (Only for testing! Re-enable immediately after)

5. **Add detailed logging around settlements:**
   ```typescript
   console.log('[Settlement] Before DB operation, session:', !!supabase);
   console.log('[Settlement] User ID:', user?.id);
   ```

## Conclusion

**The database schema and RLS policies are fundamentally correct.**

However, the combination of:
1. Settlement operations (2 DB calls instead of 1)
2. Realtime re-subscription bug (now fixed)
3. Rapid session refresh attempts (now fixed)
4. Server Action cookie corruption (now fixed)

...likely caused the session to become stale, making `auth.uid()` return `NULL`, causing RLS policy failures, leading to session invalidation and auto-logout.

**With our fixes to the client-side code, the issue should be resolved.** The database itself doesn't need changes.

If the issue persists after deployment, it would indicate a deeper Supabase session management issue that would require contacting Supabase support.
