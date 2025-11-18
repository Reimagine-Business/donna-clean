import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { ProfitLensShell } from "@/components/profit-lens/profit-lens-shell";
import { normalizeEntry, type Entry } from "@/lib/entries";

export default async function ProfitLensPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

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
