"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export async function deleteAccount(confirmationText: string) {
  const supabase = await createSupabaseServerClient();
  const { user } = await getOrRefreshUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify confirmation text
  if (confirmationText !== "DELETE MY ACCOUNT") {
    return { success: false, error: "Confirmation text doesn't match" };
  }

  try {
    // Delete user's data in order (due to foreign keys)
    // The order matters because of database constraints

    // 1. Delete notifications (if table exists)
    try {
      await supabase.from("notifications").delete().eq("user_id", user.id);
    } catch (e) {
      // Table might not exist, continue
      console.log("Notifications table not found or already deleted");
    }

    // 2. Delete alerts (if table exists)
    try {
      await supabase.from("alerts").delete().eq("user_id", user.id);
    } catch (e) {
      // Table might not exist, continue
      console.log("Alerts table not found or already deleted");
    }

    // 3. Delete settlements (if table exists)
    try {
      await supabase.from("settlements").delete().eq("user_id", user.id);
    } catch (e) {
      // Table might not exist, continue
      console.log("Settlements table not found or already deleted");
    }

    // 4. Delete entries (main table)
    const { error: entriesError } = await supabase
      .from("entries")
      .delete()
      .eq("user_id", user.id);

    if (entriesError) {
      console.error("Failed to delete entries:", entriesError);
      Sentry.captureException(entriesError, {
        tags: { action: "delete-account-entries", userId: user.id },
      });
      throw new Error("Failed to delete entries");
    }

    // 5. Delete parties
    try {
      await supabase.from("parties").delete().eq("user_id", user.id);
    } catch (e) {
      // Table might not exist or have different structure
      console.log("Parties table not found or already deleted");
    }

    // 6. Delete categories (if user has custom categories)
    try {
      await supabase.from("categories").delete().eq("user_id", user.id);
    } catch (e) {
      // Table might not exist, continue
      console.log("Categories table not found or already deleted");
    }

    // 7. Delete profile (if you have a profiles table)
    try {
      await supabase.from("profiles").delete().eq("id", user.id);
    } catch (e) {
      // Table might not exist, continue
      console.log("Profiles table not found or already deleted");
    }

    // 8. Sign out the user first
    await supabase.auth.signOut();

    // Note: We cannot delete the auth user from a server action
    // because we don't have admin privileges. The user record will remain
    // in auth.users but all their data is deleted.
    // In production, you might want to:
    // 1. Mark the account for deletion
    // 2. Have a background job that uses admin API to delete auth records
    // 3. Or use Supabase database webhooks to trigger auth user deletion

    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    Sentry.captureException(error, {
      tags: { action: "delete-account", userId: user.id },
      level: "error",
    });
    return {
      success: false,
      error: "Failed to delete account. Please contact support.",
    };
  }
}
