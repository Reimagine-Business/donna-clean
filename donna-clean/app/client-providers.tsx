'use client'

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { SupabaseProvider } from '@/supabase/Provider'
import { useState } from 'react'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient())

  return (
    <SupabaseProvider client={supabaseClient}>
      {children}
    </SupabaseProvider>
  )
}
