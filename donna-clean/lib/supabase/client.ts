// lib/supabase/client.ts
import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types' // or wherever your types are

export const createBrowserClient = () =>
  _createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
