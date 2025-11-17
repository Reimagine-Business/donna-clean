import type { SupabaseClient } from "@supabase/supabase-js";

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
  const newEntryType = isCredit ? "Cash Inflow" : "Cash Outflow";

  const { error: insertError } = await supabase.from("entries").insert({
    user_id: entry.user_id,
    entry_type: newEntryType,
    category: entry.category,
    payment_method: entry.payment_method,
    amount,
    entry_date: settlementDate,
    notes: `Settlement of ${entry.entry_type.toLowerCase()} ${entry.id}`,
  });

  if (insertError) {
    throw insertError;
  }

  const { error: updateError } = await supabase
    .from("entries")
    .update({
      settled: true,
      settled_at: settlementDate,
    })
    .eq("id", entry.id);

  if (updateError) {
    throw updateError;
  }
}
