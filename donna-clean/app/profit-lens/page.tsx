import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { ProfitLensShell } from "@/components/profit-lens/profit-lens-shell";
import { normalizeEntry, type Entry } from "@/lib/entries";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function ProfitLensPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Then continue with your queries using this supabase client

  const { data } = await supabase
    .from("entries")
    .select(
      "id, user_id, entry_type, category, payment_method, amount, entry_date, notes, image_url, settled, settled_at, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false });

  const entries: Entry[] = data?.map((entry) => normalizeEntry(entry)) ?? [];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex flex-col gap-10">
        <SiteHeader />
        <section className="px-4 pb-12 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <ProfitLensShell initialEntries={entries} userId={user.id} />
          </div>
        </section>
      </div>
    </main>
  );
}
