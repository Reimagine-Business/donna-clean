import type { SupabaseClient } from "@supabase/supabase-js";

import { Entry } from "@/lib/entries";

type SettleParams = {
  supabase: SupabaseClient;
  entry: Entry;
  amount: number;
  settlementDate: string;
};

export async function settleEntry({
  supabase,
  entry,
  amount,
  settlementDate,
}: SettleParams) {
  const isCredit = entry.entry_type === "Credit";
  const isAdvance = entry.entry_type === "Advance";
  if (!isCredit && !isAdvance) {
    throw new Error("Only Credit and Advance entries can be settled");
  }

  const remainingAmount = Number.isFinite(entry.remaining_amount)
    ? entry.remaining_amount
    : entry.amount;
  const amountToSettle = Number(amount.toFixed(2));

  if (!Number.isFinite(amountToSettle) || amountToSettle <= 0) {
    throw new Error("Settlement amount must be greater than zero.");
  }

  if (amountToSettle > remainingAmount) {
    throw new Error("Settlement amount exceeds remaining balance.");
  }

  const nextRemainingAmount = Number(
    Math.max(remainingAmount - amountToSettle, 0).toFixed(2),
  );
  const isFullySettled = nextRemainingAmount <= 0;

  const settlementEntryType: Entry["entry_type"] =
    isCredit && entry.category === "Sales"
      ? "Cash Inflow"
      : isCredit
        ? "Cash Outflow"
        : "Credit";

  const settlementPaymentMethod =
    isAdvance && settlementEntryType === "Credit" ? "None" : entry.payment_method;

  const settlementNotes = isAdvance
    ? `Advance recognised for ${entry.category} entry ${entry.id}`
    : entry.category === "Sales"
      ? `Credit collection for invoice ${entry.id}`
      : `Credit bill settlement for entry ${entry.id}`;

  const { error: insertError } = await supabase.from("entries").insert({
    user_id: entry.user_id,
    entry_type: settlementEntryType,
    category: entry.category,
    payment_method: settlementPaymentMethod,
    amount: amountToSettle,
    remaining_amount: settlementEntryType === "Credit" ? amountToSettle : 0,
    entry_date: settlementDate,
    notes: settlementNotes,
  });

  if (insertError) {
    throw insertError;
  }

  const { error: updateError } = await supabase
    .from("entries")
    .update({
      remaining_amount: nextRemainingAmount,
      settled: isFullySettled,
      settled_at: isFullySettled ? settlementDate : null,
    })
    .eq("id", entry.id);

  if (updateError) {
    throw updateError;
  }

  await revalidateDashboards();
}

const DASHBOARD_PATHS = ["/cashpulse", "/profit-lens"];

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
