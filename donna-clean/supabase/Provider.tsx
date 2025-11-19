"use client";

import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseProviderProps = {
  children: ReactNode;
  client: SupabaseClient;
};

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  return <>{children}</>;
}
