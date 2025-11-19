import { createClient as createSupabaseBrowserClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createBrowserClient() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Missing Supabase browser environment variables – check .env.local or deployment env.");
    return null; // Return null to handle gracefully in calling code (e.g., check if client is null)
  }
  return createSupabaseBrowserClient(supabaseUrl, supabaseKey);
}

export function createClient() {
  return createBrowserClient();
}
