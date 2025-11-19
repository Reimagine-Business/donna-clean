'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { SupabaseProvider } from '@/supabase/Provider'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => supabase)

  return (
    <SupabaseProvider client={supabaseClient}>
      {children}
    </SupabaseProvider>
  )
}
