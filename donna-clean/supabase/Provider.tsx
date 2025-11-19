"use client";

import type { ReactNode } from "react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseProviderProps = {
  children: ReactNode;
  client: SupabaseClient;
};

export function SupabaseProvider({ children, client }: SupabaseProviderProps) {
  if (!client) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[SupabaseProvider] Supabase client missing – skipping provider render.");
    }
    return <>{children}</>;
  }

  return (
    <SessionContextProvider supabaseClient={client}>
      {children}
    </SessionContextProvider>
  );
}
