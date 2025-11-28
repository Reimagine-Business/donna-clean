-- ═══════════════════════════════════════════════════════════
-- FIX: Enable profile editing for all users
-- ═══════════════════════════════════════════════════════════
-- This script fixes RLS policies to allow all users to edit their own profile
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- First, ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update access for users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert access for users" ON public.profiles;

-- Create new, clean policies with clear names
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

-- Policy 3: UPDATE (Edit own profile) - THE CRITICAL ONE
CREATE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: DELETE (Optional - allows users to delete their own profile)
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verify the policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Expected output:
-- profiles_delete_policy | DELETE | authenticated | (auth.uid() = user_id)
-- profiles_insert_policy | INSERT | authenticated | WITH CHECK: (auth.uid() = user_id)
-- profiles_select_policy | SELECT | authenticated | (auth.uid() = user_id)
-- profiles_update_policy | UPDATE | authenticated | (auth.uid() = user_id) WITH CHECK: (auth.uid() = user_id)

-- ═══════════════════════════════════════════════════════════
-- VERIFICATION QUERY
-- ═══════════════════════════════════════════════════════════
-- Run this as a test user to verify they can update their profile:
/*
UPDATE public.profiles
SET username = 'Test User Updated'
WHERE user_id = auth.uid();

SELECT * FROM public.profiles WHERE user_id = auth.uid();
*/

-- ═══════════════════════════════════════════════════════════
-- DONE! All users can now edit their own profile
-- ═══════════════════════════════════════════════════════════
