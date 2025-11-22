'use client'

// Note: With @supabase/ssr, we no longer need a global provider
// Each component creates its own client using createClient() from @/lib/supabase/client

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
