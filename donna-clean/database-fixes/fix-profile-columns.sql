-- Fix Profile Update Issues: Add missing columns and set up RLS
-- Run this SQL in your Supabase SQL Editor

-- 1. Add username column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='profiles' AND column_name='username') THEN
    ALTER TABLE profiles ADD COLUMN username TEXT;
    COMMENT ON COLUMN profiles.username IS 'User display name';
  END IF;
END $$;

-- 2. Add address column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='profiles' AND column_name='address') THEN
    ALTER TABLE profiles ADD COLUMN address TEXT;
    COMMENT ON COLUMN profiles.address IS 'Business address';
  END IF;
END $$;

-- 3. Add logo_url column if it doesn't exist (should already exist but just in case)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='profiles' AND column_name='logo_url') THEN
    ALTER TABLE profiles ADD COLUMN logo_url TEXT;
    COMMENT ON COLUMN profiles.logo_url IS 'URL to business logo image';
  END IF;
END $$;

-- 4. Verify RLS policies are set up correctly
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create proper RLS policies
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Populate default values for existing rows (optional)
UPDATE profiles
SET username = COALESCE(username, SPLIT_PART(email, '@', 1))
WHERE username IS NULL AND email IS NOT NULL;

UPDATE profiles
SET address = COALESCE(address, '')
WHERE address IS NULL;

-- 6. Verify the fixes
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('username', 'address', 'logo_url', 'business_name', 'user_id')
ORDER BY column_name;

-- Expected output should show all these columns exist
