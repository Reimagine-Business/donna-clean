// lib/supabase/client.ts
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'

export const createSupabaseBrowser = () =>
  createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
