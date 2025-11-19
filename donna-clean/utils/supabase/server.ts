import { createSupabaseServerClient as createServerClient } from "@/lib/supabase/server";

export async function createSupabaseServerClient() {
  return createServerClient();
}
