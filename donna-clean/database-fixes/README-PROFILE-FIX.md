# Fix: Profile Editing for All Users

## Issue
New users cannot edit their profile (username, business name, address). Only the main/admin user can edit their profile.

## Root Cause
Missing or conflicting Row Level Security (RLS) policies on the `profiles` table in Supabase.

## Diagnosis
The profiles table needs proper UPDATE policy to allow users to edit their own profile data.

---

## Solution

### Step 1: Run the SQL Fix

Go to **Supabase Dashboard → SQL Editor** and run this script:

```sql
-- File: fix-profile-rls-policies.sql
-- This ensures all users can edit their own profile

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create clean policies
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_policy"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_delete_policy"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### Step 2: Verify Policies

Run this query to verify policies are correct:

```sql
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

**Expected Output:**
```
policyname              | cmd    | qual                         | with_check
------------------------|--------|------------------------------|---------------------------
profiles_delete_policy  | DELETE | (auth.uid() = user_id)       | NULL
profiles_insert_policy  | INSERT | NULL                         | (auth.uid() = user_id)
profiles_select_policy  | SELECT | (auth.uid() = user_id)       | NULL
profiles_update_policy  | UPDATE | (auth.uid() = user_id)       | (auth.uid() = user_id)
```

### Step 3: Test the Fix

1. Login as a **new user** (not admin)
2. Go to `/profile`
3. Click **"Edit"** on Username field
4. Change username to "Test User"
5. Click **"Save"**
6. ✅ Should save successfully and show updated value
7. Refresh page
8. ✅ Change should persist

---

## What Changed

### Before (Broken):
- Missing or incomplete UPDATE policy
- Users got permission denied error
- Only admin could edit profiles

### After (Fixed):
- Complete RLS policies for SELECT, INSERT, UPDATE, DELETE
- All authenticated users can edit **their own** profile
- Security: Users can only edit their own data (user_id = auth.uid())

---

## Code Verification

### Profile Page Component
File: `app/profile/page.tsx`

The update function is correct - no code changes needed:

```typescript
const handleUpdate = async (field: string, value: string) => {
  if (!user) return

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        [field]: value,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)  // ✅ Updates OWN profile only

    if (error) {
      console.error('❌ Update error:', error)
      throw error
    }

    await loadProfile()
    setEditingField(null)
  } catch (error: unknown) {
    showError(`Failed to update profile: ${errorMessage}`)
  }
}
```

### No Admin Checks
The profile page has NO admin-only restrictions. All users can edit their own profile.

---

## Security Notes

✅ **Secure**: Users can only edit their own profile
✅ **RLS Enforced**: Database-level security via Postgres RLS
✅ **No SQL Injection**: Using Supabase client with parameterized queries
✅ **Authenticated Only**: Must be logged in to update profile

---

## Troubleshooting

### Still can't edit profile?

1. **Check if logged in**:
   ```typescript
   // In browser console
   const { data: { user } } = await supabase.auth.getUser()
   console.log('Current user:', user)
   ```

2. **Check RLS policies**:
   - Go to Supabase Dashboard → Authentication → Policies
   - Find `profiles` table
   - Should see 4 policies: SELECT, INSERT, UPDATE, DELETE

3. **Check browser console**:
   - Open DevTools → Console
   - Try editing profile
   - Look for error messages
   - Common errors:
     - "new row violates row-level security policy" = RLS policy issue
     - "permission denied" = Missing UPDATE policy

4. **Test with SQL**:
   ```sql
   -- Login as test user in Supabase, then run:
   UPDATE public.profiles
   SET username = 'Test Update'
   WHERE user_id = auth.uid();

   -- Should succeed without errors
   ```

---

## Files Modified

- ✅ `database-fixes/fix-profile-rls-policies.sql` - SQL fix script
- ✅ `database-fixes/README-PROFILE-FIX.md` - This documentation
- ⚠️ No code changes needed - issue is database-only

---

## Summary

**Issue**: New users couldn't edit profile
**Cause**: Missing RLS UPDATE policy
**Fix**: Run `fix-profile-rls-policies.sql` in Supabase
**Test**: Login as new user → Edit profile → Should work ✅

---

## Next Steps

After running the fix:
1. Test with multiple users
2. Verify all profile fields can be edited (username, business_name, address)
3. Test logo upload still works
4. Commit this fix to repository
5. Update deployment documentation to include this migration

Done! 🎉
