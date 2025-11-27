# Storage Bucket Setup Instructions

## Issue: Logo Upload Fails with "Bucket not found"

The logo upload feature requires a Supabase Storage bucket named "logos" which doesn't exist yet.

## Steps to Fix

### 1. Create the Storage Bucket

1. Open your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** button
4. Configure the bucket:
   - **Name**: `logos`
   - **Public bucket**: **YES** ✅ (Required so logos can be displayed)
   - **File size limit**: 5MB (recommended)
   - **Allowed MIME types**: `image/*` (optional but recommended)
5. Click **"Create bucket"**

### 2. Set Up Storage RLS Policies

After creating the bucket, set up the following policies:

#### Option A: Via Supabase Dashboard (Easier)

1. Go to **Storage** → **Policies** tab
2. Click **"New Policy"** for each of these:

**Policy 1: Public Read Access**
- **Policy name**: `Public can read logos`
- **Allowed operation**: SELECT
- **Target roles**: `public`
- **Policy definition**:
```sql
bucket_id = 'logos'
```

**Policy 2: Authenticated Users Can Upload**
- **Policy name**: `Users can upload logos`
- **Allowed operation**: INSERT
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
bucket_id = 'logos'
```

**Policy 3: Authenticated Users Can Update**
- **Policy name**: `Users can update logos`
- **Allowed operation**: UPDATE
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
bucket_id = 'logos'
```

**Policy 4: Authenticated Users Can Delete**
- **Policy name**: `Users can delete logos`
- **Allowed operation**: DELETE
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
bucket_id = 'logos'
```

#### Option B: Via SQL Editor (Advanced)

Run this SQL in the Supabase SQL Editor:

```sql
-- Policy 1: Anyone can read logos (public access)
CREATE POLICY "Public can read logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'logos' );

-- Policy 2: Authenticated users can upload logos
CREATE POLICY "Users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'logos' );

-- Policy 3: Authenticated users can update logos
CREATE POLICY "Users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'logos' );

-- Policy 4: Authenticated users can delete logos
CREATE POLICY "Users can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'logos' );
```

### 3. Test the Logo Upload

After setting up the bucket and policies:

1. Go to your Profile page
2. Click "Edit" on the Logo field
3. Choose an image file
4. Upload should succeed with "✅ Logo uploaded successfully!"
5. Logo should appear in your profile immediately

## Verification

To verify the setup is correct, check:

1. **Bucket exists**: Go to Storage → should see "logos" bucket
2. **Policies exist**: Go to Storage → Policies → should see 4 policies for "logos" bucket
3. **Public access**: The bucket should be marked as "Public"

## Troubleshooting

**If upload still fails:**
- Check browser console for detailed error messages
- Verify the bucket name is exactly "logos" (lowercase, no spaces)
- Ensure the bucket is set to "Public"
- Check that all 4 RLS policies are active

**If logo doesn't display after upload:**
- Verify the bucket is set to "Public"
- Check that the "Public can read logos" policy exists
- Open browser DevTools Network tab to see if the image URL returns 403 (permissions issue)
