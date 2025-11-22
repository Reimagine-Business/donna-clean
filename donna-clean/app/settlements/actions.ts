"use server";

import { revalidatePath } from "next/cache";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { normalizeEntry, type Entry, type SupabaseEntry } from "@/lib/entries";

type SettleEntryResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

export async function createSettlement(
  entryId: string,
  amount: number,
  settlementDate: string
): Promise<SettleEntryResult> {
  const ctx = "settlements/createSettlement";
  
  try {
    const supabase = await createSupabaseServerClient();
    
    const settledAmount = normalizeAmount(amount, 0);

    if (settledAmount <= 0) {
      return { success: false, error: "Settlement amount must be greater than zero." };
    }

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

    // Load the entry to be settled
    const latestEntry = await loadLatestEntry(supabase, entryId, user.id);

    if (latestEntry.user_id && latestEntry.user_id !== user.id) {
      return { success: false, error: "You can only settle your own entries." };
    }

    if (latestEntry.entry_type !== "Credit" && latestEntry.entry_type !== "Advance") {
      return { success: false, error: "Only Credit and Advance entries can be settled." };
    }

    const remainingAmount = normalizeAmount(
      latestEntry.remaining_amount ?? latestEntry.amount,
      latestEntry.amount,
    );

    if (settledAmount > remainingAmount) {
      return { success: false, error: "Settlement amount exceeds remaining balance." };
    }

    // For Credit entries, create a corresponding Cash entry
    if (latestEntry.entry_type === "Credit") {
      const isInflow = latestEntry.category === "Sales";
      const settlementPaymentMethod =
        latestEntry.payment_method === "Cash" || latestEntry.payment_method === "Bank"
          ? latestEntry.payment_method
          : "Cash";
          
      const { error: cashEntryError } = await supabase.from("entries").insert({
        user_id: user.id,
        entry_type: isInflow ? "Cash Inflow" : "Cash Outflow",
        category: latestEntry.category,
        payment_method: settlementPaymentMethod,
        amount: settledAmount,
        remaining_amount: settledAmount,
        entry_date: settlementDate,
        notes: `Settlement of credit ${latestEntry.category.toLowerCase()} (${latestEntry.id})`,
      });

      if (cashEntryError) {
        console.error("Failed to create cash entry for settlement", cashEntryError);
        return { success: false, error: cashEntryError.message };
      }
    }

    // Update the original entry with settlement info
    const nextRemainingAmount = Number(Math.max(remainingAmount - settledAmount, 0).toFixed(2));
    const isFullySettled = nextRemainingAmount <= 0;

    const { error: updateError } = await supabase
      .from("entries")
      .update({
        remaining_amount: nextRemainingAmount,
        settled: isFullySettled,
        settled_at: isFullySettled ? settlementDate : null,
      })
      .eq("id", latestEntry.id)
      .eq("user_id", user.id); // Ensure user can only update their own entries

    if (updateError) {
      console.error("Failed to update entry with settlement info", updateError);
      return { success: false, error: updateError.message };
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

async function loadLatestEntry(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  entryId: string,
  userId: string,
): Promise<Entry> {
  const { data, error } = await supabase
    .from("entries")
    .select(
      "id, user_id, entry_type, category, payment_method, amount, remaining_amount, entry_date, notes, image_url, settled, settled_at, created_at, updated_at",
    )
    .eq("id", entryId)
    .eq("user_id", userId) // Security: Only load user's own entries
    .single();

  if (error || !data) {
    throw new Error("Entry not found or no longer accessible.");
  }

  return normalizeEntry(data as SupabaseEntry);
}

function normalizeAmount(value: unknown, fallback: number): number {
  const candidate =
    typeof value === "number" ? value : Number.isFinite(Number(value)) ? Number(value) : fallback;
  return Number(Number(candidate).toFixed(2));
}
