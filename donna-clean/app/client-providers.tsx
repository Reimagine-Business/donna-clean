'use client'

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { useState } from 'react'
import { SupabaseProvider } from '@/supabase/Provider'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() =>
    createBrowserSupabaseClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    })
  )

  return (
    <SupabaseProvider client={supabaseClient}>
      {children}
    </SupabaseProvider>
  )
}
