"use client";

import type { ReactNode } from "react";

// Note: This provider is deprecated with @supabase/ssr
// We no longer need a SessionContextProvider wrapper
// Each component creates its own client using createClient() from @/lib/supabase/client

type SupabaseProviderProps = {
  children: ReactNode;
  client?: unknown; // kept for backwards compatibility
};

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  return <>{children}</>;
}
