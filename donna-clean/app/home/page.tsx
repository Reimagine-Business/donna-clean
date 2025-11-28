import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { HomeShell } from "@/components/home/home-shell";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";

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

  // Fetch reminders from database
  const { data: reminders, error: remindersError } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true });

  if (remindersError) {
    console.error("Error fetching reminders:", remindersError);
  }

  // Fetch critical and warning alerts (unread only)
  const { data: alerts, error: alertsError } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .in("type", ["critical", "warning"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (alertsError) {
    console.error("Error fetching alerts:", alertsError);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex flex-col">
        {/* Desktop Header */}
        <SiteHeader />

        {/* Mobile Header */}
        <TopNavMobile />

        {/* Main Content */}
        <section className="px-4 pb-24 md:px-8 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <HomeShell
              initialReminders={reminders || []}
              initialAlerts={alerts || []}
              userId={user.id}
            />
          </div>
        </section>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </main>
  );
}
