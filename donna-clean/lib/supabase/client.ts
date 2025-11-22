// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a new Supabase browser client.
 * 
 * IMPORTANT: Always create a NEW client instance per component using useMemo:
 * 
 * @example
 * const supabase = useMemo(() => createClient(), []);
 * 
 * DO NOT use a singleton/shared client - it can hold stale session references!
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
