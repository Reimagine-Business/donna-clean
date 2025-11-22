import { createServerClient } from "@supabase/ssr";
import type { AuthError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

export async function updateSession(request: NextRequest) {
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

  // IMPORTANT: Use getSession() first (doesn't make API call)
  // This checks if we have session cookies without hitting Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    // We have a session - validate it's not expired
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? 0;
    
    // If session expires in more than 5 minutes, it's good
    if (expiresAt > now + 300) {
      response.headers.set("x-auth-session", "active");
      return response;
    }
    
    // Session is expiring soon (< 5 min), try to refresh
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (!refreshError && refreshData.session) {
      response.headers.set("x-auth-session", "active");
      return response;
    }
    
    // Refresh failed - session will expire, but let request continue
    // Page will redirect to login if needed
    response.headers.set("x-auth-session", "expiring");
    return response;
  }

  // No session at all - user is not logged in
  // DON'T try to refresh - there's nothing to refresh!
  // Let the request continue, page will redirect to login if needed
  response.headers.set("x-auth-session", "missing");
  return response;
}
