'use client'
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { AlertsPageClient } from "@/components/alerts/alerts-page-client";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function AlertsPage() {
  const supabase = createClient();
  const router = useRouter();

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

  // Fetch reminders with React Query (only when user is available)
  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: ['alerts-reminders', userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];

      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userData.id)
        .order("due_date", { ascending: true });

      if (error) {
        console.error("Error fetching reminders:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!userData?.id, // Only run when user is available
    staleTime: 60 * 1000, // 1 minute
  });

  // Redirect if no user (after loading completes)
  if (!userLoading && !userData) {
    router.push("/auth/login");
    return null;
  }

  // Show loading skeleton while fetching
  if (userLoading || remindersLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
        <div className="flex flex-col min-h-screen">
          <SiteHeader />
          <TopNavMobile />

          <section className="flex-1 px-4 py-4 md:px-8 overflow-auto">
            <div className="mx-auto w-full max-w-6xl">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-purple-500/20 rounded w-48"></div>
                <div className="h-64 bg-purple-500/10 rounded"></div>
              </div>
            </div>
          </section>
        </div>

        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <TopNavMobile />

        <section className="flex-1 px-4 py-4 md:px-8 overflow-auto">
          <div className="mx-auto w-full max-w-6xl">
            <AlertsPageClient initialReminders={reminders || []} />
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
