import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { BusinessSnapshot } from "@/components/dashboard/business-snapshot";
import { GreetingSection } from "@/components/home/greeting-section";
import { BusinessInsights } from "@/components/home/business-insights";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getEntries } from "@/app/entries/actions";
import { EntryListSkeleton } from "@/components/skeletons/entry-skeleton";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { user, initialError } = await getOrRefreshUser(supabase);

  if (!user) {
    console.error(
      `[Auth Fail] No user in home/page${
        initialError ? ` – error: ${initialError.message}` : ""
      }`,
      initialError ?? undefined,
    );
    redirect("/auth/login");
  }

  // Fetch entries for dashboard
  const { entries } = await getEntries();

  // Fetch user profile for business name
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('user_id', user.id)
    .maybeSingle();

  // Fetch reminders for Today's News
  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('due_date', { ascending: true });

  return (
    <main className="min-h-screen bg-gray-50 text-foreground">
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <TopNavMobile />

        {/* SECTION 1: DARK HEADER */}
        <div className="bg-gradient-to-br from-[#1a0e33] to-[#0f0820] px-4 py-6">
          <div className="mx-auto w-full max-w-6xl">
            {/* Greeting with user badge */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour < 12) return 'Good morning';
                    if (hour < 18) return 'Good afternoon';
                    return 'Good evening';
                  })()}
                </h1>
                {profile?.business_name && (
                  <p className="text-xs sm:text-sm text-white/70 mt-0.5">
                    {profile.business_name}
                  </p>
                )}
              </div>
              {/* User badge with initials */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-400
                              flex items-center justify-center text-white font-bold text-sm shrink-0">
                {profile?.business_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: LIGHT CONTENT */}
        <section className="flex-1 bg-gray-50 px-4 py-4 pb-24 md:pb-8 overflow-auto">
          <div className="mx-auto w-full max-w-6xl space-y-3">
            {/* Business Insights */}
            <BusinessInsights entries={entries} reminders={reminders || []} />

            {/* Business Snapshot */}
            <Suspense fallback={<EntryListSkeleton />}>
              <BusinessSnapshot entries={entries} />
            </Suspense>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
