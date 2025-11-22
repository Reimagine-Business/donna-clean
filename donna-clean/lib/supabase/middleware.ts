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
          // CRITICAL: Set all cookies on the SAME response object
          // Creating a new response for each cookie would lose previous cookies!
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              maxAge: options?.maxAge ?? SESSION_MAX_AGE_SECONDS,
            });
          });
        },
      },
    },
  );

  // Use getUser() instead of getSession() to validate the JWT
  // getUser() makes an API call to verify the token is still valid
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user) {
    // User is authenticated and JWT is valid
    response.headers.set("x-auth-session", "active");
    return response;
  }

  // No valid user, attempt to refresh the session
  console.warn(
    `[Auth] No user in ${ctx} – error {${error ? error.message : "none"}}. Attempting refresh...`,
    error ?? undefined,
  );

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError || !refreshData.session) {
    console.error(
      `[Auth Fail] Refresh failed in ${ctx}${
        refreshError ? ` – error: ${refreshError.message}` : ""
      }`,
      refreshError ?? undefined,
    );
    response.headers.set("x-auth-session", "missing");
    // Don't redirect here - let the page handle it
    return response;
  }

  // Refresh successful
  console.info(`[Auth] Session refreshed successfully in ${ctx}`);
  response.headers.set("x-auth-session", "active");
  return response;
}
