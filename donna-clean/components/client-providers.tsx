"use client";

import { useState, type ReactNode } from "react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ThemeProvider } from "next-themes";

import { SupabaseProvider } from "@/supabase/Provider";
import { AuthSessionKeeper } from "@/components/auth-session-keeper";

type ClientProvidersProps = {
  children: ReactNode;
};

export function ClientProviders({ children }: ClientProvidersProps) {
  const [supabaseClient] = useState<SupabaseClient>(() => createBrowserSupabaseClient());

  return (
    <SupabaseProvider client={supabaseClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthSessionKeeper />
        {children}
      </ThemeProvider>
    </SupabaseProvider>
  );
}
