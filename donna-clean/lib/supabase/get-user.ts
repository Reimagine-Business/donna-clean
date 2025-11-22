import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";

export type GetOrRefreshUserResult = {
  user: User | null;
  wasInitiallyNull: boolean;
  initialError: AuthError | null;
  refreshError: AuthError | null;
  didRefresh: boolean;
  isEmailVerified: boolean;
};

const isUserEmailVerified = (user: User | null): boolean => {
  if (!user) {
    return false;
  }
  const confirmedAt =
    user.email_confirmed_at ??
    (user as { confirmed_at?: string | null }).confirmed_at ??
    (user.user_metadata?.confirmed_at as string | null) ??
    null;
  return Boolean(confirmedAt);
};

/**
 * Gets the current user from Supabase.
 * 
 * IMPORTANT: This function should ONLY be called from Server Actions, Route Handlers,
 * and Server Components. It does NOT attempt to refresh the session because:
 * - Server Actions cannot set response cookies
 * - Session refresh should be handled by middleware
 * 
 * If getUser() returns null, the middleware should have already attempted a refresh.
 * If it's still null, the user needs to re-authenticate.
 */
export async function getOrRefreshUser(
  supabase: SupabaseClient,
): Promise<GetOrRefreshUserResult> {
  // Use getUser() which validates the JWT from the cookie
  // This is the recommended approach for Server Actions
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const isEmailVerified = isUserEmailVerified(user);

  if (user && !isEmailVerified) {
    console.warn("[Auth] Email not verified in getUser()", { email: user.email, id: user.id });
  }

  if (!user && error) {
    console.warn(
      `[Auth] No user found in getUser() – error: ${error.message}. Middleware should have refreshed the session.`,
      error
    );
  }

  return {
    user,
    wasInitiallyNull: !user,
    initialError: error ?? null,
    refreshError: null, // We no longer attempt refresh in Server Actions
    didRefresh: false,
    isEmailVerified,
  };
}
