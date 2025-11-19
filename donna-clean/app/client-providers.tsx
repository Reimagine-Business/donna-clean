'use client'

import { SupabaseProvider } from '@/supabase/Provider'
import { supabase } from '@/lib/supabase/client'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <SupabaseProvider client={supabase}>{children}</SupabaseProvider>
}
