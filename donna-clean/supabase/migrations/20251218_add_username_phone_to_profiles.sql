-- Add username and phone columns to profiles table
-- Migration: 20251218_add_username_phone_to_profiles

-- Add username column (unique, required for login)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add phone column (optional)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index on username for fast lookups during login
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Add constraint to ensure username follows correct format
-- (3-20 characters, alphanumeric, underscores, hyphens only)
ALTER TABLE profiles
ADD CONSTRAINT username_format CHECK (
  username IS NULL OR
  (username ~ '^[a-zA-Z0-9_-]{3,20}$')
);

-- Comment the columns
COMMENT ON COLUMN profiles.username IS 'Unique username for login (alternative to email)';
COMMENT ON COLUMN profiles.phone IS 'Optional phone number for user contact';
