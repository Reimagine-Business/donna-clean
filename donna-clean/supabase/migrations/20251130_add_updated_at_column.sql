-- Migration: Add updated_at column to entries table if it doesn't exist
-- This ensures the settle_entry function can reference updated_at
-- Date: 2025-11-30

-- Add updated_at column if it doesn't exist
ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

-- Create or replace the trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at = timezone('utc', now());
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS set_entries_updated_at ON public.entries;
CREATE TRIGGER set_entries_updated_at
BEFORE UPDATE ON public.entries
FOR EACH ROW EXECUTE FUNCTION public.set_entries_updated_at();

-- Backfill existing records to have updated_at = created_at
UPDATE public.entries
SET updated_at = COALESCE(created_at, timezone('utc', now()))
WHERE updated_at IS NULL;

COMMENT ON COLUMN public.entries.updated_at IS 'Automatically updated timestamp tracking when the entry was last modified';
