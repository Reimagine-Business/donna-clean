import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { DailyEntriesShell } from "@/components/daily-entries/daily-entries-shell";
import { DebugPanel } from "@/components/daily-entries/debug-panel";
import { normalizeEntry, type Entry } from "@/lib/entries";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Never cache - always fetch fresh data

export default async function DailyEntriesPage() {
  const supabase = await createSupabaseServerClient();
  const { user, initialError } = await getOrRefreshUser(supabase);

  if (!user) {
    console.error(
      `[Auth Fail] No user in daily-entries/page${
        initialError ? ` – error: ${initialError.message}` : ""
      }`,
      initialError ?? undefined,
    );
    redirect("/auth/login");
  }

  // Then continue with your queries using this supabase client

    const { data, error } = await supabase
      .from("entries")
      .select(
        "id, user_id, entry_type, category, payment_method, amount, remaining_amount, entry_date, notes, image_url, settled, settled_at, created_at, updated_at",
      )
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false });

  const entries: Entry[] = data?.map((entry) => normalizeEntry(entry)) ?? [];

  // === CHECKPOINT 1: Parent Page Data Fetch ===
  console.log('🔥 PARENT PAGE - Data Fetch:');
  console.log('  Raw data count:', data?.length);
  console.log('  Normalized entries count:', entries.length);
  console.log('  Error:', error);
  console.log('  First 2 raw entries:', data?.slice(0, 2));
  console.log('  First 2 normalized entries:', entries.slice(0, 2));
  console.log('  ==================');

  return (
    <main className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <div className="flex flex-col gap-10">
        <SiteHeader />
        <TopNavMobile />
        <section className="px-4 pb-12 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <DailyEntriesShell initialEntries={entries} userId={user.id} />
          </div>
        </section>
      </div>
      <BottomNav />
      {/* Debug panel to verify data is being passed from server */}
      <DebugPanel entries={entries} userId={user.id} />
    </main>
  );
}
