import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { AlertsPageClient } from "@/components/alerts/alerts-page-client";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const supabase = await createSupabaseServerClient();
  const { user, initialError } = await getOrRefreshUser(supabase);

  if (!user) {
    console.error(
      `[Auth Fail] No user in alerts/page${
        initialError ? ` – error: ${initialError.message}` : ""
      }`,
      initialError ?? undefined,
    );
    redirect("/auth/login");
  }

  // Fetch reminders from database
  const { data: reminders, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching reminders:", error);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex flex-col gap-10">
        {/* Desktop Header */}
        <SiteHeader />

        {/* Client Component with Mobile Header and Content */}
        <AlertsPageClient
          userEmail={user.email || ""}
          initialReminders={reminders || []}
        />

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </main>
  );
}
