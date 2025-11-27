'use client'

import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { CashpulseShell } from "@/components/cashpulse/cashpulse-shell";
import { SessionExpiredNotice } from "@/components/session-expired-notice";
import { CashpulseSkeletonLoading } from "@/components/ui/skeleton-card";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function CashpulsePage() {
  const supabase = createClient();

  // Fetch user with React Query
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch entries with React Query (only when user is available)
  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ['cashpulse-entries', userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];

      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", userData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userData?.id, // Only run when user is available
    staleTime: 60 * 1000, // 1 minute
  });

  // Show loading skeleton while fetching
  if (userLoading || entriesLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
        <div className="flex flex-col gap-10">
          <SiteHeader />
          <TopNavMobile />
          <section className="px-4 pb-12 md:px-8">
            <div className="mx-auto w-full max-w-6xl">
              <CashpulseSkeletonLoading />
            </div>
          </section>
        </div>
        <BottomNav />
      </main>
    );
  }

  // Show session expired if no user
  if (!userData) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="flex flex-col gap-10">
          <SiteHeader />
          <section className="px-4 pb-12 md:px-8">
            <div className="mx-auto w-full max-w-6xl">
              <SessionExpiredNotice
                message="Session expired – please login again"
              />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <div className="flex flex-col gap-10">
        <SiteHeader />
        <TopNavMobile />
        <section className="px-4 pb-12 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <CashpulseShell initialEntries={entries || []} userId={userData.id} />
          </div>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
