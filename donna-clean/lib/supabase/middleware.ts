import { createServerClient } from "@supabase/ssr";
import type { AuthError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

export async function updateSession(request: NextRequest) {
  const ctx = "middleware";
  let response = NextResponse.next({ request });

  if (!hasEnvVars) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, {
              ...options,
              maxAge: options?.maxAge ?? SESSION_MAX_AGE_SECONDS,
            });
          });
        },
      },
    },
  );

  const logSessionNull = (error: AuthError | null) => {
    console.warn(
      `[Auth] Session null on ${ctx} – error {${error ? error.message : "none"}}`,
      error ?? undefined,
    );
  };

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (session && error) {
    console.error("[Auth] middleware getSession warning", error);
  }

  let activeSession = session ?? null;

  if (!activeSession) {
    logSessionNull(error ?? null);

    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      console.error(
        `[Auth Fail] Refresh error {${refreshError.message}} on ${ctx}`,
        refreshError,
      );
    } else {
      activeSession = refreshData.session ?? null;
      if (activeSession) {
        console.info(`[Auth] Refreshed OK on ${ctx}`);
      }
    }
  }

  response.headers.set("x-auth-session", activeSession ? "active" : "missing");

  return response;
}
