"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { type EntryType, type CategoryType, type PaymentMethod } from "@/lib/entries";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const entryTypeIsCredit = (type: EntryType): boolean => type === "Credit";

const entryTypeRequiresCashMovement = (type: EntryType): boolean =>
  type === "Cash IN" || type === "Cash OUT" || type === "Advance";

type AddEntryInput = {
  entry_type: EntryType;
  category: CategoryType;
  payment_method: PaymentMethod;
  amount: number;
  entry_date: string;
  notes: string | null;
  image_url: string | null;
  party_id?: string; // Optional party (customer/vendor) ID - backward compatible
};

export async function addEntry(data: AddEntryInput) {
  const supabase = await createSupabaseServerClient();

  const { user, initialError } = await getOrRefreshUser(supabase);

  if (!user) {
    console.error(
      `[Auth Fail] No user in daily-entries/addEntry${
        initialError ? ` – error: ${initialError.message}` : ""
      }`,
      initialError ?? undefined,
    );
    redirect("/auth/login");
  }

  const amount = Number(data.amount);

  if (!Number.isFinite(amount)) {
    return { error: "Amount must be a valid number." };
  }

  if (entryTypeIsCredit(data.entry_type) && data.payment_method !== "None") {
    return { error: "Credit entries must use Payment Method: None" };
  }

  if (entryTypeRequiresCashMovement(data.entry_type) && data.payment_method === "None") {
    return { error: "This entry type requires actual payment" };
  }

  const shouldTrackRemaining = data.entry_type === "Credit" || data.entry_type === "Advance";

  const payload = {
    user_id: user.id,
    entry_type: data.entry_type,
    category: data.category,
    payment_method: entryTypeIsCredit(data.entry_type) ? "None" : data.payment_method,
    amount,
    remaining_amount: shouldTrackRemaining ? amount : null,
    entry_date: data.entry_date,
    notes: data.notes,
    image_url: data.image_url,
    party_id: data.party_id || null,
  };

  const { error } = await supabase.from("entries").insert(payload);

  if (error) {
    console.error("Failed to insert entry", error);
    return { error: error.message };
  }

  await supabase
    .from("entries")
    .select("id, user_id")
    .order("created_at", { ascending: false })
    .limit(1);

  revalidatePath("/daily-entries");
  revalidatePath("/analytics/cashpulse");
  revalidatePath("/analytics/profitlens");

  return { success: true };
}

type UpdateEntryInput = {
  entry_type: EntryType;
  category: CategoryType;
  payment_method: PaymentMethod;
  amount: number;
  entry_date: string;
  notes: string | null;
  image_url: string | null;
  party_id?: string; // Optional party (customer/vendor) ID - backward compatible
};

export async function updateEntry(entryId: string, data: UpdateEntryInput) {
  const supabase = await createSupabaseServerClient();

  const { user, initialError } = await getOrRefreshUser(supabase);

  if (!user) {
    console.error(
      `[Auth Fail] No user in daily-entries/updateEntry${
        initialError ? ` – error: ${initialError.message}` : ""
      }`,
      initialError ?? undefined,
    );
    return { success: false, error: "You must be signed in to update entries." };
  }

  const amount = Number(data.amount);

  if (!Number.isFinite(amount)) {
    return { success: false, error: "Amount must be a valid number." };
  }

  if (entryTypeIsCredit(data.entry_type) && data.payment_method !== "None") {
    return { success: false, error: "Credit entries must use Payment Method: None" };
  }

  if (entryTypeRequiresCashMovement(data.entry_type) && data.payment_method === "None") {
    return { success: false, error: "This entry type requires actual payment" };
  }

  const shouldTrackRemaining = data.entry_type === "Credit" || data.entry_type === "Advance";

  const payload = {
    entry_type: data.entry_type,
    category: data.category,
    payment_method: entryTypeIsCredit(data.entry_type) ? "None" : data.payment_method,
    amount,
    remaining_amount: shouldTrackRemaining ? amount : null,
    entry_date: data.entry_date,
    notes: data.notes,
    image_url: data.image_url,
    party_id: data.party_id || null,
  };

  const { error } = await supabase
    .from("entries")
    .update(payload)
    .eq("id", entryId)
    .eq("user_id", user.id); // Ensure user can only update their own entries

  if (error) {
    console.error("Failed to update entry", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/daily-entries");
  revalidatePath("/analytics/cashpulse");
  revalidatePath("/analytics/profitlens");

  return { success: true };
}

export async function deleteEntry(entryId: string) {
  const supabase = await createSupabaseServerClient();

  const { user, initialError } = await getOrRefreshUser(supabase);

  if (!user) {
    console.error(
      `[Auth Fail] No user in daily-entries/deleteEntry${
        initialError ? ` – error: ${initialError.message}` : ""
      }`,
      initialError ?? undefined,
    );
    return { success: false, error: "You must be signed in to delete entries." };
  }

  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id); // Ensure user can only delete their own entries

  if (error) {
    console.error("Failed to delete entry", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/daily-entries");
  revalidatePath("/analytics/cashpulse");
  revalidatePath("/analytics/profitlens");

  return { success: true };
}
