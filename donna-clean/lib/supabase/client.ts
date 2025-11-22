// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

// Singleton instance for components that need a shared client
let clientInstance: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient()
  }
  return clientInstance
}

// Default export for convenience
export const supabase = getSupabaseClient()
