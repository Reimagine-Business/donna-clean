import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function createBrowserClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase browser environment variables.");
  }

  return createSupabaseBrowserClient(supabaseUrl, supabaseKey);
}

export function createClient() {
  return createBrowserClient();
}
