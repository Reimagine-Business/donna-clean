# Profile Update Fixes

## Issues Found

After analyzing the profile page code, I found the following issues:

### 1. ✅ Profile Update Code is Correct
The code in `app/profile/page.tsx` is already correctly implemented:
- Uses `profiles` table ✅
- Uses `user_id` as foreign key ✅
- Update logic is consistent for all fields ✅

### 2. ❌ Missing Database Columns
The `profiles` table is likely missing the `username` and `address` columns. This is why:
- Business Name updates work (column exists)
- Username updates fail (column missing)
- Address updates fail (column missing)

### 3. ❌ Missing Storage Bucket
The logo upload code tries to use a `logos` storage bucket that doesn't exist yet.

## How to Fix

### Step 1: Fix Database Schema (Required)

Run the SQL file in your Supabase SQL Editor:

```bash
# File: database-fixes/fix-profile-columns.sql
```

This SQL will:
- ✅ Add `username` column to profiles table
- ✅ Add `address` column to profiles table
- ✅ Verify `logo_url` column exists
- ✅ Set up proper RLS policies
- ✅ Populate default values for existing rows

**How to run:**
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Click **"New query"**
4. Copy and paste the contents of `fix-profile-columns.sql`
5. Click **"Run"**
6. Check the output to verify all columns were added

### Step 2: Create Storage Bucket (Required)

Follow the instructions in:

```bash
# File: database-fixes/STORAGE-SETUP-INSTRUCTIONS.md
```

This involves:
1. Creating a public `logos` bucket in Supabase Storage
2. Setting up 4 RLS policies for the bucket
3. Testing the upload

**This MUST be done via the Supabase Dashboard** (cannot be automated in code)

## What Each File Does

| File | Purpose |
|------|---------|
| `fix-profile-columns.sql` | Adds missing columns to profiles table |
| `STORAGE-SETUP-INSTRUCTIONS.md` | Instructions for creating the logos bucket |
| `README.md` | This file - overview of all fixes |

## Testing After Fixes

### Test 1: Username Update
1. Go to Profile page
2. Click "Edit" on Username field
3. Enter a new username
4. Click "Save"
5. ✅ Should show success and update immediately

### Test 2: Address Update
1. Go to Profile page
2. Click "Edit" on Address field
3. Enter a new address
4. Click "Save"
5. ✅ Should show success and update immediately

### Test 3: Logo Upload
1. Go to Profile page
2. Click "Edit" on Logo field
3. Choose an image file (PNG/JPG, under 5MB)
4. Upload starts automatically
5. ✅ Should show "Logo uploaded successfully!"
6. ✅ Logo should appear in profile header

### Test 4: Business Name (Already Works)
1. Go to Profile page
2. Click "Edit" on Business Name field
3. Enter a new business name
4. Click "Save"
5. ✅ Should continue to work as before

## Expected Results

After running both fixes:

| Field | Status Before | Status After |
|-------|--------------|--------------|
| Username | ❌ Failed | ✅ Works |
| Address | ❌ Failed | ✅ Works |
| Logo Upload | ❌ Bucket not found | ✅ Works |
| Business Name | ✅ Works | ✅ Still works |

## Code Changes Required

**None!** 🎉

The existing code in `app/profile/page.tsx` and `components/profile/upload-logo-modal.tsx` is already correctly implemented. All fixes are database-side only:
- Add missing columns
- Create storage bucket
- Set up RLS policies

## Troubleshooting

### Username/Address still failing after SQL?

Check if the columns were actually added:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('username', 'address');
```

Should return 2 rows.

### Logo upload still failing?

1. Verify bucket exists: Go to Storage → should see "logos"
2. Check bucket is public: Click on logos → Settings → "Public bucket" should be ON
3. Verify RLS policies: Go to Storage → Policies → should see 4 policies for "logos"

### Still having issues?

Add this debugging code to `app/profile/page.tsx` line 72:
```typescript
} catch (error: any) {
  console.error('Error updating profile:', error)
  console.error('Error details:', error.message, error.code)
  alert(`Failed to update profile: ${error.message}`)
}
```

This will show the exact error message in the browser console.

## Summary

**Root Causes:**
1. Missing `username` and `address` columns in profiles table
2. Missing `logos` storage bucket

**Solutions:**
1. Run `fix-profile-columns.sql` in Supabase SQL Editor ✅
2. Create `logos` bucket via Supabase Dashboard ✅

**No code changes needed** - the existing code is correct!
