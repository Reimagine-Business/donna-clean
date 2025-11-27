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
  console.log('🔵 [SERVER] Fetching entries for user:', user.id);
  console.log('🔵 [SERVER] User email:', user.email);

  // First, try to count total entries (bypassing RLS if possible)
  const { count: totalCount, error: countError } = await supabase
    .from("entries")
    .select("*", { count: "exact", head: true });

  console.log('🔵 [SERVER] Total entries in database (all users):', totalCount);
  if (countError) console.error('  Count error:', countError);

  // Now fetch entries for this specific user
  const { data, error } = await supabase
    .from("entries")
    .select(
      "id, user_id, entry_type, category, payment_method, amount, remaining_amount, entry_date, notes, image_url, settled, settled_at, created_at",
    )
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false });

  console.log('🔵 [SERVER] Query result:');
  console.log('  - Raw data count:', data?.length || 0);
  console.log('  - Error:', error);
  if (data && data.length > 0) {
    console.log('  - First entry raw:', JSON.stringify(data[0], null, 2));
    console.log('  - Entry dates:', data.slice(0, 5).map(e => e.entry_date));
  } else {
    console.log('  - ⚠️ NO DATA RETURNED FROM DATABASE');
    console.log('  - This could be:');
    console.log('    1. RLS policy blocking reads');
    console.log('    2. No entries in database for this user');
    console.log('    3. Supabase connection issue');
  }

  const entries: Entry[] = data?.map((entry) => normalizeEntry(entry)) ?? [];
  console.log('🔵 [SERVER] Normalized:', entries.length, 'entries');

  if (error) {
    console.error('❌ [SERVER] Error fetching entries:', error);
  }

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
    </main>
  );
}
