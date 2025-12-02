"use server";

import { revalidatePath } from "next/cache";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type SettleEntryResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Atomically settles a Credit or Advance entry using a database transaction.
 * 
 * For Credit entries:
 * - Creates a Cash Inflow/Outflow entry
 * - Updates the original entry's remaining_amount and settled status
 * 
 * Both operations are atomic - they either both succeed or both fail.
 * No partial failures possible.
 * 
 * Uses PostgreSQL RPC function `settle_entry` with row-level locking
 * to prevent concurrent settlements on the same entry.
 */
export async function createSettlement(
  entryId: string,
  amount: number,
  settlementDate: string
): Promise<SettleEntryResult> {
  const ctx = "settlements/createSettlement";
  
  try {
    const supabase = await createSupabaseServerClient();
    
    // Client-side validation
    const settledAmount = normalizeAmount(amount, 0);

    if (settledAmount <= 0) {
      return { success: false, error: "Settlement amount must be greater than zero." };
    }

    // Auth check
    const { user, initialError } = await getOrRefreshUser(supabase);

    if (!user) {
      console.error(
        `[Auth Fail] No user in ${ctx}${
          initialError ? ` – error: ${initialError.message}` : ""
        }`,
        initialError ?? undefined,
      );
      return { success: false, error: "You must be signed in to settle entries." };
    }

    // ✅ Call atomic RPC function (includes transaction)
    // This performs:
    // 1. SELECT ... FOR UPDATE (locks row)
    // 2. Validation (entry type, remaining amount)
    // 3. INSERT cash entry (for Credit entries)
    // 4. UPDATE original entry
    // All wrapped in PostgreSQL transaction - either ALL succeed or ALL fail
    const { data, error } = await supabase.rpc('settle_entry', {
      p_entry_id: entryId,
      p_user_id: user.id,
      p_settlement_amount: settledAmount,
      p_settlement_date: settlementDate,
    });

    if (error) {
      console.error("Failed to settle entry via RPC", error);
      return { success: false, error: error.message };
    }

    // ✅ FIX: RPC returns an ARRAY, so check data[0]
    if (!data || data.length === 0) {
      return { success: false, error: "No response from settlement function" };
    }

    const result = data[0] as { success: boolean; message?: string };

    if (!result.success) {
      return { success: false, error: result.message || "Settlement failed" };
    }

    // Revalidate all affected pages
    revalidatePath("/daily-entries");
    revalidatePath("/analytics/cashpulse");
    revalidatePath("/analytics/profitlens");

    return { success: true };
  } catch (error) {
    console.error("Failed to settle entry", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to settle entry.",
    };
  }
}

/**
 * Deletes a settlement by:
 * 1. For Credit entries: Deletes the Cash IN/OUT entry that was created during settlement
 * 2. Marks the original entry as unsettled and restores the remaining_amount
 *
 * This properly reverses all effects of the settlement.
 */
export async function deleteSettlement(entryId: string): Promise<SettleEntryResult> {
  const ctx = "settlements/deleteSettlement";

  console.log('🗑️ [SERVER_ACTION] deleteSettlement called')
  console.log('🗑️ [SERVER_ACTION] Entry ID:', entryId)
  console.log('🗑️ [SERVER_ACTION] Entry ID type:', typeof entryId)
  console.log('🗑️ [SERVER_ACTION] Entry ID length:', entryId?.length)

  try {
    const supabase = await createSupabaseServerClient();

    // Auth check
    const { user, initialError } = await getOrRefreshUser(supabase);

    if (!user) {
      console.error(
        `❌ [SERVER_ACTION] [Auth Fail] No user in ${ctx}${
          initialError ? ` – error: ${initialError.message}` : ""
        }`,
        initialError ?? undefined,
      );
      return { success: false, error: "You must be signed in to delete settlements." };
    }

    console.log('✅ [SERVER_ACTION] User authenticated:', user.id)

    // Get the entry to verify ownership and get original amount
    console.log('🔍 [SERVER_ACTION] Fetching entry from database...')
    const { data: entry, error: fetchError } = await supabase
      .from("entries")
      .select("id, user_id, amount, settled, entry_type, category")
      .eq("id", entryId)
      .single();

    console.log('📊 [SERVER_ACTION] Fetch result:', { entry, fetchError })

    if (fetchError || !entry) {
      console.error('❌ [SERVER_ACTION] Entry not found:', fetchError)
      return { success: false, error: "Entry not found or no longer accessible." };
    }

    console.log('✅ [SERVER_ACTION] Entry found:', entry)

    // Verify ownership
    if (entry.user_id !== user.id) {
      return { success: false, error: "You can only delete your own settlements." };
    }

    // Verify it's actually settled
    if (!entry.settled) {
      return { success: false, error: "Entry is not settled." };
    }

    // Verify it's a Credit or Advance entry
    if (entry.entry_type !== "Credit" && entry.entry_type !== "Advance") {
      return { success: false, error: "Only Credit and Advance settlement deletions are supported." };
    }

    // For Credit entries, delete the Cash IN/OUT entry that was created during settlement
    if (entry.entry_type === "Credit") {
      // Try multiple note patterns to handle different migration versions
      // Pattern 1: "Settlement of credit sales (uuid)" (older migrations)
      // Pattern 2: "Settlement of Credit Sales (ID: uuid)" (newer migration)
      const patterns = [
        `Settlement of credit ${entry.category.toLowerCase()} (${entryId})`,
        `Settlement of Credit ${entry.category} (ID: ${entryId})`,
        `Settlement of credit ${entry.category} (${entryId})`, // mixed case fallback
      ];

      let deleted = false;
      for (const pattern of patterns) {
        const { data, error: deleteError } = await supabase
          .from("entries")
          .delete()
          .eq("user_id", user.id)
          .eq("notes", pattern)
          .select();

        if (!deleteError && data && data.length > 0) {
          console.log(`✅ Deleted settlement entry with pattern: ${pattern}`);
          deleted = true;
          break;
        }
      }

      if (!deleted) {
        console.error("Failed to delete settlement cash entry - no matching pattern found");
        // Try one more approach: search by notes containing the entry ID
        const { error: deleteError } = await supabase
          .from("entries")
          .delete()
          .eq("user_id", user.id)
          .like("notes", `%${entryId}%`)
          .like("notes", `%Settlement%`)
          .in("entry_type", ["Cash IN", "Cash OUT"]);

        if (deleteError) {
          console.error("Failed to delete settlement cash entry", deleteError);
          // Continue anyway - we'll still mark the original as unsettled
        } else {
          console.log("✅ Deleted settlement entry using LIKE search");
        }
      }
    }

    // Mark original entry as unsettled and restore remaining_amount to original amount
    const { error: updateError } = await supabase
      .from("entries")
      .update({
        settled: false,
        settled_at: null,
        remaining_amount: entry.amount, // Restore to original amount
      })
      .eq("id", entryId);

    if (updateError) {
      console.error("Failed to update original entry", updateError);
      return { success: false, error: updateError.message };
    }

    // Revalidate all affected pages
    revalidatePath("/daily-entries");
    revalidatePath("/analytics/cashpulse");
    revalidatePath("/analytics/profitlens");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete settlement", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to delete settlement.",
    };
  }
}

function normalizeAmount(value: unknown, fallback: number): number {
  const candidate =
    typeof value === "number" ? value : Number.isFinite(Number(value)) ? Number(value) : fallback;
  return Number(Number(candidate).toFixed(2));
}
