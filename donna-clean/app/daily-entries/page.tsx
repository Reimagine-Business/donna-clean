import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";

async function addEntry(formData: FormData) {
  "use server";

  const title = formData.get("title");
  const notes = formData.get("notes");

  if (typeof title !== "string" || !title.trim()) {
    return;
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
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

  await supabase.from("entries").insert({
    title: title.trim(),
    notes: typeof notes === "string" ? notes.trim() : null,
    user_id: user.id,
  });

  revalidatePath("/daily-entries");
}

export default async function DailyEntriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: entries } = await supabase
    .from("entries")
    .select("id, title, notes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-12 items-center">
        <SiteHeader />
        <section className="w-full max-w-4xl p-5 flex flex-col gap-8">
          <div className="space-y-2">
            <p className="text-sm uppercase text-muted-foreground">
              Ritual builder
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Daily entries
            </h1>
            <p className="text-muted-foreground">
              Capture what happened today so your future self can spot trends and
              opportunities.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Add a new entry</CardTitle>
              <CardDescription>Title + notes are all you need.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={addEntry} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="E.g. Successful product demo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Summarize key wins, blockers, metrics, or insights."
                  />
                </div>
                <Button type="submit" className="w-full md:w-auto">
                  Save entry
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Your entries</h2>
            {!entries?.length ? (
              <p className="text-sm text-muted-foreground">
                No entries yet. Your daily reflections will show up here.
              </p>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <Card key={entry.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{entry.title}</CardTitle>
                      <CardDescription>
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(entry.created_at))}
                      </CardDescription>
                    </CardHeader>
                    {entry.notes ? (
                      <CardContent>
                        <p className="text-sm whitespace-pre-line">
                          {entry.notes}
                        </p>
                      </CardContent>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
