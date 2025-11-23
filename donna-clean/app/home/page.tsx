import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { HamburgerMenu } from "@/components/navigation/hamburger-menu";
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

        {/* Mobile Header */}
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <HamburgerMenu businessName="Donna Clean" userEmail={user.email || undefined} />
            <h1 className="text-lg font-semibold">Home</h1>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
              <span className="text-xl">🔔</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <section className="px-4 pb-24 md:px-8 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <HomeShell initialReminders={reminders || []} />
          </div>
        </section>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </main>
  );
}
