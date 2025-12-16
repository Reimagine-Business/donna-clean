"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrRefreshUser } from "@/lib/supabase/get-user";

type DeleteAccountResult = {
  success?: boolean;
  error?: string;
};

export async function deleteAccount(confirmationText: string): Promise<DeleteAccountResult> {
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

    // 1. Delete settlement history
    await supabase.from("settlement_history").delete().eq("user_id", user.id);

    // 2. Delete alerts
    await supabase.from("alerts").delete().eq("user_id", user.id);

    // 3. Delete reminders
    await supabase.from("reminders").delete().eq("user_id", user.id);

    // 4. Delete entries
    await supabase.from("daily_entries").delete().eq("user_id", user.id);

    // 5. Delete parties
    await supabase.from("parties").delete().eq("user_id", user.id);

    // 6. Call delete_user RPC function to remove auth user
    const { error: authError } = await supabase.rpc("delete_user");

    if (authError) {
      console.error("Auth deletion error:", authError);
      throw authError;
    }

    // Sign out
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return {
      success: false,
      error: "Failed to delete account. Please contact support."
    };
  }
}
