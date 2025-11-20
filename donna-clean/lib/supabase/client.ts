import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './dbTypes'   // or './types' if you kept that name

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)
