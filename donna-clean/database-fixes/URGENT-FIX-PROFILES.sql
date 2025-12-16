-- ═══════════════════════════════════════════════════════════
-- URGENT FIX: Profile RLS Policies and Data Issues
-- ═══════════════════════════════════════════════════════════
-- This script fixes BOTH issues:
-- 1. Profile editing not working (RLS policies)
-- 2. Profile error on re-login (duplicate/missing profiles)
--
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- STEP 1: Check current state
-- ═══════════════════════════════════════════════════════════
SELECT 'Current Policies:' as status;
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

SELECT 'Current Profiles:' as status;
SELECT user_id, username, business_name, created_at
FROM public.profiles;

-- STEP 2: Fix RLS Policies
-- ═══════════════════════════════════════════════════════════

-- Enable RLS (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update access for users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert access for users" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Create clean, working policies
-- Policy 1: SELECT (Read own profile)
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: INSERT (Create own profile)
CREATE POLICY "profiles_insert_policy"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: UPDATE (Edit own profile) - THE CRITICAL ONE FOR EDITING
CREATE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: DELETE (Delete own profile)
CREATE POLICY "profiles_delete_policy"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- STEP 3: Fix Missing Profiles for Existing Users
-- ═══════════════════════════════════════════════════════════
-- This creates profiles for any users who don't have one yet

INSERT INTO public.profiles (user_id, username, business_name, role)
SELECT
  au.id as user_id,
  COALESCE(
    au.raw_user_meta_data->>'username',
    split_part(au.email, '@', 1)
  ) as username,
  COALESCE(
    au.raw_user_meta_data->>'business_name',
    'My Business'
  ) as business_name,
  'owner' as role
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL;

-- STEP 4: Verify the fix
-- ═══════════════════════════════════════════════════════════

SELECT 'New Policies (should see 4 policies):' as status;
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

SELECT 'All Profiles (should match number of users):' as status;
SELECT
  COUNT(*) as total_profiles,
  COUNT(DISTINCT user_id) as unique_users
FROM public.profiles;

SELECT 'Users vs Profiles count:' as status;
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  CASE
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.profiles)
    THEN '✅ MATCH - All users have profiles'
    ELSE '❌ MISMATCH - Some users missing profiles'
  END as status;

-- ═══════════════════════════════════════════════════════════
-- TESTING QUERIES (Run these to verify)
-- ═══════════════════════════════════════════════════════════

-- Test 1: Can you see your own profile?
-- (Run this as a logged-in user in your app)
-- SELECT * FROM public.profiles WHERE user_id = auth.uid();

-- Test 2: Can you update your own profile?
-- (Run this as a logged-in user in your app)
-- UPDATE public.profiles
-- SET username = 'Test Update ' || NOW()::text
-- WHERE user_id = auth.uid()
-- RETURNING *;

-- Test 3: Verify you CANNOT see other users' profiles
-- (Should return 0 rows)
-- SELECT * FROM public.profiles WHERE user_id != auth.uid();

-- ═══════════════════════════════════════════════════════════
-- EXPECTED RESULTS
-- ═══════════════════════════════════════════════════════════
--
-- After running this script, you should see:
-- 1. ✅ 4 policies: SELECT, INSERT, UPDATE, DELETE
-- 2. ✅ All users have profiles (users count = profiles count)
-- 3. ✅ Profile editing works in the app
-- 4. ✅ No "Profile Error" on login
--
-- ═══════════════════════════════════════════════════════════
-- DONE!
-- ═══════════════════════════════════════════════════════════
