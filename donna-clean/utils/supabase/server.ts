import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createSupabaseServerClient() {
  return createServerSupabaseClient();
}
