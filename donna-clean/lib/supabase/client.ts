"use client";

import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createBrowserClient(): SupabaseClient {
  return createBrowserSupabaseClient();
}

export function createClient(): SupabaseClient {
  return createBrowserClient();
}
