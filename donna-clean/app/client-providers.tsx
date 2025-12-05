'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

// Note: With @supabase/ssr, we no longer need a global provider
// Each component creates its own client using createClient() from @/lib/supabase/client

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  // Create a client that persists for the lifetime of the component
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
