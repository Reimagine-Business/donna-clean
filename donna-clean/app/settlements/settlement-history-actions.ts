"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";

export type SettlementHistoryRecord = {
  id: string;
  user_id: string;
  original_entry_id: string;
  settlement_entry_id: string | null;
  settlement_type: 'credit' | 'advance';
  entry_type: 'Credit' | 'Advance';
  category: string;
  amount: number;
  settlement_date: string;
  notes: string | null;
  created_at: string;
};

/**
 * Fetches all settlement history records for the current user
 * from the settlement_history table.
 *
 * This includes both Credit and Advance settlements.
 */
export async function getSettlementHistory(): Promise<{
  settlementHistory: SettlementHistoryRecord[];
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return { settlementHistory: [], error: "Unauthorized" };
    }

    // Fetch settlement history from the new table
    const { data, error } = await supabase
      .from("settlement_history")
      .select("*")
      .eq("user_id", user.id)
      .order("settlement_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch settlement history:", error);
      return { settlementHistory: [], error: error.message };
    }

    return { settlementHistory: data || [] };
  } catch (error) {
    console.error("Exception in getSettlementHistory:", error);
    return {
      settlementHistory: [],
      error: error instanceof Error ? error.message : "Failed to fetch settlement history",
    };
  }
}

/**
 * Deletes a settlement from settlement_history and reverses all effects.
 *
 * For Credit settlements:
 * - Deletes the Cash IN/OUT entry (if it exists)
 * - Marks original entry as unsettled
 * - Deletes settlement history record
 *
 * For Advance settlements:
 * - Marks original entry as unsettled
 * - Deletes settlement history record
 */
export async function deleteSettlementHistory(settlementId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return { success: false, error: "Unauthorized" };
    }

    // Get the settlement record
    const { data: settlement, error: fetchError } = await supabase
      .from("settlement_history")
      .select("*")
      .eq("id", settlementId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !settlement) {
      console.error("Settlement not found:", fetchError);
      return { success: false, error: "Settlement not found" };
    }

    // For Credit settlements, delete the Cash IN/OUT entry
    if (settlement.settlement_type === 'credit' && settlement.settlement_entry_id) {
      const { error: deleteEntryError } = await supabase
        .from("entries")
        .delete()
        .eq("id", settlement.settlement_entry_id)
        .eq("user_id", user.id);

      if (deleteEntryError) {
        console.error("Failed to delete settlement entry:", deleteEntryError);
        // Continue anyway - we'll still mark original as unsettled
      }
    }

    // Mark original entry as unsettled (both Credit and Advance)
    const { error: updateError } = await supabase
      .from("entries")
      .update({
        settled: false,
        settled_at: null,
        // Restore remaining_amount to full amount
        // Note: This assumes full settlement. Partial settlements would need more logic.
      })
      .eq("id", settlement.original_entry_id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update original entry:", updateError);
      return { success: false, error: updateError.message };
    }

    // Delete the settlement history record
    const { error: deleteHistoryError } = await supabase
      .from("settlement_history")
      .delete()
      .eq("id", settlementId)
      .eq("user_id", user.id);

    if (deleteHistoryError) {
      console.error("Failed to delete settlement history:", deleteHistoryError);
      return { success: false, error: deleteHistoryError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception in deleteSettlementHistory:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete settlement",
    };
  }
}
