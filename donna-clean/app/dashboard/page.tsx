import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-12 items-center">
        <SiteHeader />
        <section className="w-full max-w-4xl p-5 flex flex-col gap-8">
          <div>
            <p className="text-sm uppercase text-muted-foreground">
              Welcome back
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {profile?.business_name || "Business name not set"}
            </h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Business profile</CardTitle>
                <CardDescription>Key information on file.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Business name</p>
                  <p className="font-medium">
                    {profile?.business_name || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium">{profile?.role || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily check-ins</CardTitle>
                <CardDescription>
                  Keep track of wins, blockers, and notes.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Add your first note on the{" "}
                <a className="underline" href="/daily-entries">
                  daily entries
                </a>{" "}
                page to build momentum.
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
