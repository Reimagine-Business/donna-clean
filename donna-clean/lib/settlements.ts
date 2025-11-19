import type { SupabaseClient } from "@supabase/supabase-js";

import type { Entry, SupabaseEntry } from "@/lib/entries";
import { normalizeEntry } from "@/lib/entries";

// To fix schema errors, run the SQL in scripts/supabase-migrations/add-settlement-columns.sql in Supabase SQL Editor. This adds remaining_amount, settled, settled_at and backfills.

/**
 * Heads-up: run `psql -f supabase/fix-remaining-amounts.sql` once if legacy entries need a remaining_amount backfill.
 */
type CreateSettlementParams = {
  supabase: SupabaseClient;
  entryId: string;
  amount: number;
  settlementDate: string;
};

export type SettleEntryResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

const DASHBOARD_PATHS = ["/cashpulse", "/profit-lens", "/daily-entries"];

export async function createSettlement({
  supabase,
  entryId,
  amount,
  settlementDate,
}: CreateSettlementParams): Promise<SettleEntryResult> {
  try {
    const settledAmount = normalizeAmount(amount, 0);

    if (settledAmount <= 0) {
      return { success: false, error: "Settlement amount must be greater than zero." };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Unable to load user for settlement", userError);
    }

    if (!user) {
      return { success: false, error: "You must be signed in to settle entries." };
    }

    const latestEntry = await loadLatestEntry(supabase, entryId);

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
        return { success: false, error: cashEntryError.message };
      }
    }

    const nextRemainingAmount = Number(
      Math.max(remainingAmount - settledAmount, 0).toFixed(2),
    );
    const isFullySettled = nextRemainingAmount <= 0;

    const { error: updateError } = await supabase
      .from("entries")
      .update({
        remaining_amount: nextRemainingAmount,
        settled: isFullySettled,
        settled_at: isFullySettled ? settlementDate : null,
      })
      .eq("id", latestEntry.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await revalidateDashboards();

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
  supabase: SupabaseClient,
  entryId: string,
): Promise<Entry> {
  const { data, error } = await supabase
    .from("entries")
    .select(
      "id, user_id, entry_type, category, payment_method, amount, remaining_amount, entry_date, notes, image_url, settled, settled_at, created_at, updated_at",
    )
    .eq("id", entryId)
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

async function revalidateDashboards() {
  try {
    if (typeof window === "undefined") {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/cashpulse");
      revalidatePath("/profit-lens");
      revalidatePath("/daily-entries");
      return;
    }

    await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paths: DASHBOARD_PATHS }),
      credentials: "same-origin",
    });
  } catch (error) {
    console.error("Failed to revalidate dashboards", error);
  }
}
