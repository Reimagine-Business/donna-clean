"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import * as Sentry from "@sentry/nextjs";

export async function deleteAccount(confirmationText: string) {
  const supabase = await createSupabaseServerClient();
  const { user } = await getOrRefreshUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (confirmationText !== "DELETE MY ACCOUNT") {
    return { success: false, error: "Confirmation text doesn't match" };
  }

  try {
    // Delete in order (respecting foreign keys)

    // 1. Delete settlements
    await supabase.from("settlements").delete().eq("user_id", user.id);

    // 2. Delete entries
    await supabase.from("entries").delete().eq("user_id", user.id);

    // 3. Delete parties
    await supabase.from("parties").delete().eq("user_id", user.id);

    // 4. Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

    if (authError) throw authError;

    // Sign out
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);

    // Log to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        tags: {
          action: "deleteAccount",
          user_id: user?.id,
        },
      });
    }

    return {
      success: false,
      error: "Failed to delete account. Please contact support."
    };
  }
}
