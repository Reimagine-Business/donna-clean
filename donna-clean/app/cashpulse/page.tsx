import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { CashpulseShell } from "@/components/cashpulse/cashpulse-shell";
import { SessionExpiredNotice } from "@/components/session-expired-notice";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

export default async function CashpulsePage() {
  const supabase = await createSupabaseServerClient();
  const { user, initialError } = await getOrRefreshUser(supabase);

  if (!user) {
    console.error(
      `[Auth Fail] No user in cashpulse/page${
        initialError ? ` – error: ${initialError.message}` : ""
      }`,
      initialError ?? undefined,
    );
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

  // Then continue with your queries using this supabase client

  const { data: entries, error } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (
    <main className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <div className="flex flex-col gap-10">
        <SiteHeader />
        <section className="px-4 pb-12 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <CashpulseShell initialEntries={entries || []} userId={user.id} />
          </div>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
