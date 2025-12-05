import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { DailyEntriesShell } from "@/components/daily-entries/daily-entries-shell";
import { normalizeEntry, type Entry } from "@/lib/entries";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Never cache - always fetch fresh data

export default async function EntriesPage() {
  const supabase = await createSupabaseServerClient();
  const { user, initialError } = await getOrRefreshUser(supabase);

  if (!user) {
    console.error(
      `[Auth Fail] No user in entries/page${
        initialError ? ` – error: ${initialError.message}` : ""
      }`,
      initialError ?? undefined,
    );
    redirect("/auth/login");
  }

  // Then continue with your queries using this supabase client

  // Now fetch entries for this specific user with party information
  const { data, error } = await supabase
    .from("entries")
    .select(`
      id, user_id, entry_type, category, payment_method, amount, remaining_amount,
      entry_date, notes, image_url, settled, settled_at, created_at, party_id,
      party:parties(name)
    `)
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch entries:", error);
  }

  const entries: Entry[] = data?.map((entry) => normalizeEntry(entry as any)) ?? [];

  return (
    <>
      <TopNavMobile />
      <SiteHeader />
      <main className="flex-1 pb-32 md:pb-6">
        <DailyEntriesShell initialEntries={entries} userId={user.id} />
      </main>
      <BottomNav />
    </>
  );
}
