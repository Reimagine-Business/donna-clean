import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { HamburgerMenu } from "@/components/navigation/hamburger-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic'

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
        console.error("Profile fetch error:", error);
        throw error;
      }

      if (data) {
        profile = data;
      } else {
        // Profile doesn't exist, try to create it
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
          // If insert fails due to duplicate user_id (23505), try fetching again
          if (createError.code === "23505") {
            console.log("Profile already exists, fetching again...");
            const { data: existingProfile, error: refetchError } = await supabase
              .from("profiles")
              .select("business_name, role")
              .eq("user_id", user.id)
              .single();

            if (refetchError) {
              console.error("Failed to fetch existing profile:", refetchError);
              throw new Error("Profile exists but cannot be accessed. Please check RLS policies.");
            }

            profile = existingProfile;
          } else {
            console.error("Profile creation error:", createError);
            throw createError;
          }
        } else {
          profile = createdProfile;
        }
      }
    } catch (error) {
      console.error("Dashboard profile fetch failed", error);
      sessionError = error instanceof Error ? error.message : "Failed to load profile";
    }
  }

  const showLoading = !sessionError && !profile;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <HamburgerMenu businessName={profile?.business_name || "Donna Clean"} userEmail={user.email || undefined} />
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <div className="w-10" /> {/* Spacer for alignment */}
          </div>
        </header>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <SiteHeader />
        </div>

        {/* Main Content */}
        <section className="px-4 pb-24 pt-6 md:px-8 md:pb-8">
          <div className="mx-auto w-full max-w-4xl space-y-8">
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
                      <a className="underline" href="/entries">
                        daily entries
                      </a>{" "}
                      page to build momentum.
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </main>
  );
}
