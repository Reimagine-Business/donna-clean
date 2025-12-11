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
import { getEntries } from "@/app/daily-entries/actions";
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
  const entries = await getEntries();

  // Fetch user profile for business name
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <TopNavMobile />

        <section className="flex-1 px-4 py-3 md:px-8 overflow-auto">
          <div className="mx-auto w-full max-w-6xl space-y-3">
            {/* Greeting Section */}
            <GreetingSection businessName={profile?.business_name ?? null} />

            {/* Business Insights */}
            <BusinessInsights entries={entries} />

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
