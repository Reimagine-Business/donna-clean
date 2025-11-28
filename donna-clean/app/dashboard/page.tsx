import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type Profile = {
  business_name: string | null;
  role: string | null;
};

export default async function DashboardPage() {
  let sessionError: string | null = null;
  let profile: Profile | null = null;

  const supabase = await createSupabaseServerClient();
  const { user, initialError } = await getOrRefreshUser(supabase);

  if (!user) {
    console.error(
      `[Auth Fail] No user in dashboard/page${
        initialError ? ` – error: ${initialError.message}` : ""
      }`,
      initialError ?? undefined,
    );
    redirect("/auth/login");
  }

    // Then continue with your queries using this supabase client

  const metadata = (user.user_metadata as Record<string, string | null>) ?? {};

  if (!sessionError) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("business_name, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        profile = data;
      } else {
        const defaultBusinessName =
          metadata.business_name ?? user.email?.split("@")[0] ?? "Not set";
        const defaultRole = metadata.role ?? "owner";

        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            business_name: defaultBusinessName,
            role: defaultRole,
          })
          .select("business_name, role")
          .single();

        if (createError) {
          throw createError;
        }

        profile = createdProfile;
      }
    } catch (error) {
      console.error("Dashboard profile fetch failed", error);
      sessionError = error instanceof Error ? error.message : "Failed to load profile";
    }
  }

  const showLoading = !sessionError && !profile;

  return (
    <main className="min-h-screen flex flex-col items-center">
        <div className="flex-1 w-full flex flex-col gap-12 items-center">
          <SiteHeader />
          <section className="w-full max-w-4xl p-5 flex flex-col gap-8">
            {showLoading ? (
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <div>
                    <CardTitle className="text-base">
                      Loading profile...
                    </CardTitle>
                    <CardDescription>
                      Hang tight while we fetch your details.
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ) : sessionError ? (
              <Card className="border-red-500/40 bg-red-500/10">
                <CardHeader>
                  <CardTitle>Profile Error</CardTitle>
                  <CardDescription>
                    {sessionError}. Please try refreshing the page or contact support if the issue persists.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                <div>
                  <p className="text-sm uppercase text-muted-foreground">
                    Welcome back
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {profile?.business_name || "Not set"}
                  </h1>
                  <p className="text-muted-foreground">
                    {user?.email ?? "No email"}
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Business profile</CardTitle>
                      <CardDescription>
                        Key information on file.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Business name</p>
                        <p className="font-medium">
                          {profile?.business_name || "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Role</p>
                        <p className="font-medium">
                          {profile?.role || "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{user?.email ?? "Not set"}</p>
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
              </>
            )}
          </section>
        </div>
    </main>
  );
}
