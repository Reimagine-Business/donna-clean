"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

import { SupabaseProvider } from "@/supabase/Provider";
import { AuthSessionKeeper } from "@/components/auth-session-keeper";
import { supabase } from "@/lib/supabase/client";

type ClientProvidersProps = {
  children: ReactNode;
};

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SupabaseProvider client={supabase}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthSessionKeeper />
        {children}
      </ThemeProvider>
    </SupabaseProvider>
  );
}
