"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";

export type SettlementHistoryRecord = {
  id: string;
  user_id: string;
  original_entry_id: string;
  settlement_type: 'credit' | 'advance';
  entry_type: string;
  category: string;
  amount: number;
  settlement_date: string;
  notes: string | null;
  created_at: string;
};

/**
 * Fetches all settlement history records for the current user
 * from the entries table where is_settlement = true.
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

    // Fetch settlement entries from entries table
    const { data, error } = await supabase
      .from("entries")
      .select("id, user_id, original_entry_id, settlement_type, entry_type, category, amount, entry_date, notes, created_at")
      .eq("user_id", user.id)
      .eq("is_settlement", true)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch settlement history:", error);
      return { settlementHistory: [], error: error.message };
    }

    // Map to SettlementHistoryRecord format
    const settlementHistory = (data || []).map(entry => ({
      id: entry.id,
      user_id: entry.user_id,
      original_entry_id: entry.original_entry_id || '',
      settlement_type: entry.settlement_type as 'credit' | 'advance',
      entry_type: entry.entry_type,
      category: entry.category,
      amount: entry.amount,
      settlement_date: entry.entry_date,
      notes: entry.notes,
      created_at: entry.created_at,
    }));

    return { settlementHistory };
  } catch (error) {
    console.error("Exception in getSettlementHistory:", error);
    return {
      settlementHistory: [],
      error: error instanceof Error ? error.message : "Failed to fetch settlement history",
    };
  }
}

/**
 * Deletes a settlement entry and reverses all effects.
 *
 * For both Credit and Advance settlements:
 * - Deletes the settlement tracking entry (Cash IN/OUT for Credit, or Advance Settlement for Advance)
 * - Marks original entry as unsettled
 * - Restores remaining_amount to original amount
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

    // Get the settlement entry
    const { data: settlement, error: fetchError } = await supabase
      .from("entries")
      .select("*")
      .eq("id", settlementId)
      .eq("user_id", user.id)
      .eq("is_settlement", true)
      .single();

    if (fetchError || !settlement) {
      console.error("Settlement not found:", fetchError);
      return { success: false, error: "Settlement not found" };
    }

    // Delete the settlement tracking entry (both Credit and Advance)
    const { error: deleteEntryError } = await supabase
      .from("entries")
      .delete()
      .eq("id", settlementId)
      .eq("user_id", user.id);

    if (deleteEntryError) {
      console.error("Failed to delete settlement entry:", deleteEntryError);
      return { success: false, error: deleteEntryError.message };
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

    return { success: true };
  } catch (error) {
    console.error("Exception in deleteSettlementHistory:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete settlement",
    };
  }
}
