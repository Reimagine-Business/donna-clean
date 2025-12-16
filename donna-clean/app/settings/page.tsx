import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { SiteHeader } from "@/components/site-header";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { BottomNav } from "@/components/navigation/bottom-nav";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { user } = await getOrRefreshUser(supabase);

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <TopNavMobile />

        <section className="flex-1 px-4 py-8 md:px-8 overflow-auto">
          <div className="mx-auto w-full max-w-2xl">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            {/* User Info Section */}
            <section className="mb-8 p-6 border border-purple-500/30 rounded-lg bg-purple-900/10">
              <h2 className="text-xl font-semibold mb-4 text-purple-200">Account Information</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300">Email:</span>
                  <span className="font-medium text-white">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-300">User ID:</span>
                  <span className="font-mono text-sm text-purple-200">{user.id.slice(0, 8)}...</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-300">Account Created:</span>
                  <span className="text-sm text-purple-200">
                    {new Date(user.created_at || "").toLocaleDateString()}
                  </span>
                </div>
              </div>
            </section>

            {/* Delete Account Section */}
            <DeleteAccountSection />
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
