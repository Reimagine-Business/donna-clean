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

    // Parse JSON response from database function
    const result = data as { success: boolean; error?: string };
    
    if (!result.success) {
      return { success: false, error: result.error || "Settlement failed" };
    }

    // Revalidate all affected pages
    revalidatePath("/daily-entries");
    revalidatePath("/cashpulse");
    revalidatePath("/profit-lens");

    return { success: true };
  } catch (error) {
    console.error("Failed to settle entry", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to settle entry.",
    };
  }
}

function normalizeAmount(value: unknown, fallback: number): number {
  const candidate =
    typeof value === "number" ? value : Number.isFinite(Number(value)) ? Number(value) : fallback;
  return Number(Number(candidate).toFixed(2));
}
