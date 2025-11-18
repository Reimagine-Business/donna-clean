import type { SupabaseClient } from "@supabase/supabase-js";

import { Entry } from "@/lib/entries";

type SettleParams = {
  supabase: SupabaseClient;
  entry: Entry;
  amount: number;
  settlementDate: string;
};

type SettleEntryResult =
  | {
      error: string;
    }
  | {
      success: true;
    };

export async function settleEntry({
  supabase,
  entry,
  amount,
  settlementDate,
}: SettleParams): Promise<SettleEntryResult> {
  const originalEntry = entry;

  if (originalEntry.entry_type !== "Credit" && originalEntry.entry_type !== "Advance") {
    return { error: "Only Credit and Advance entries can be settled" };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Unable to load user for settlement", userError);
  }

  if (!user) {
    return { error: "You must be signed in to settle entries." };
  }

  const remainingAmount = Number.isFinite(originalEntry.remaining_amount)
    ? originalEntry.remaining_amount
    : originalEntry.amount;

  const settledAmount = Number(Number(amount).toFixed(2));

  if (!Number.isFinite(settledAmount) || settledAmount <= 0) {
    return { error: "Settlement amount must be greater than zero." };
  }

  if (settledAmount > remainingAmount) {
    return { error: "Settlement amount exceeds remaining balance." };
  }

  if (originalEntry.entry_type === "Credit") {
    const isInflow = originalEntry.category === "Sales";
    const { error } = await supabase.from("entries").insert({
      user_id: user.id,
      entry_type: isInflow ? "Cash Inflow" : "Cash Outflow",
      category: originalEntry.category,
      payment_method: originalEntry.payment_method,
      amount: settledAmount,
      entry_date: settlementDate,
      notes: `Settlement of credit ${originalEntry.category.toLowerCase()}`,
    });

    if (error) {
      return { error: error.message };
    }
  }

  if (originalEntry.entry_type === "Advance") {
    const { error } = await supabase.from("entries").insert({
      user_id: user.id,
      entry_type: "Cash Inflow",
      category: originalEntry.category,
      payment_method: "None",
      amount: settledAmount,
      entry_date: settlementDate,
      notes: `Recognition of advance ${originalEntry.category.toLowerCase()}`,
    });

    if (error) {
      return { error: error.message };
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
    .eq("id", originalEntry.id);

  if (updateError) {
    return { error: updateError.message };
  }

  await revalidateDashboards();

  return { success: true };
}

const DASHBOARD_PATHS = ["/cashpulse", "/profit-lens", "/daily-entries"];

async function revalidateDashboards() {
  try {
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
