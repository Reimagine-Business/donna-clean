import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { InfoIcon } from "lucide-react";
import { FetchDataSteps } from "@/components/tutorial/fetch-data-steps";
import { getOrRefreshUser } from "@/lib/supabase/get-user";

export default async function ProtectedPage() {
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
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The setAll method was called from a Server Component.
            // This can be ignored if you have no intention of writing cookies from Server Components.
          }
        },
      },
    },
  );

    const { user, wasInitiallyNull, initialError, refreshError } = await getOrRefreshUser(supabase);

    if (wasInitiallyNull) {
      console.warn(
        `[Auth] Session null on protected/page – error {${
          initialError ? initialError.message : "none"
        }}`,
        initialError ?? undefined,
      );
    }

    if (!user) {
      if (refreshError) {
        console.error(
          `[Auth Fail] Refresh error {${refreshError.message}} on protected/page`,
          refreshError,
        );
      }
      redirect("/auth/login");
    }

  // Then continue with your queries using this supabase client

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated
          user
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Your user details</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto">
          {JSON.stringify(data.claims, null, 2)}
        </pre>
      </div>
      <div>
        <h2 className="font-bold text-2xl mb-4">Next steps</h2>
        <FetchDataSteps />
      </div>
    </div>
  );
}
