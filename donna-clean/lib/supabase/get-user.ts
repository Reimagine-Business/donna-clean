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

export async function getOrRefreshUser(
  supabase: SupabaseClient,
): Promise<GetOrRefreshUserResult> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user) {
    const isEmailVerified = isUserEmailVerified(user);

    if (!isEmailVerified) {
      console.warn("[Auth] Email not verified in getUser()", { email: user.email, id: user.id });
    }

    return {
      user,
      wasInitiallyNull: false,
      initialError: error ?? null,
      refreshError: null,
      didRefresh: false,
      isEmailVerified,
    };
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  const refreshedUser = refreshData?.user ?? refreshData?.session?.user ?? null;
  const isEmailVerified = isUserEmailVerified(refreshedUser);

  if (refreshedUser && !isEmailVerified) {
    console.warn("[Auth] Email not verified after refresh in getUser()", {
      email: refreshedUser.email,
      id: refreshedUser.id,
    });
  }

  return {
    user: refreshedUser,
    wasInitiallyNull: true,
    initialError: error ?? null,
    refreshError: refreshError ?? null,
    didRefresh: Boolean(refreshedUser),
    isEmailVerified,
  };
}
