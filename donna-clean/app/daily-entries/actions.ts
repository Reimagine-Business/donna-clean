"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { type EntryType, type CategoryType, type PaymentMethod } from "@/lib/entries";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { protectedAction, validateEntryInput, sanitizeEntryInput } from "@/lib/action-wrapper";

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

  // Apply security wrapper with rate limiting, validation, and error handling
  return protectedAction(
    user.id,
    {
      rateLimitKey: 'create-entry',
      validateInputs: () => validateEntryInput(data)
    },
    async () => {
      const amount = Number(data.amount);

      if (!Number.isFinite(amount)) {
        throw new Error("Amount must be a valid number.");
      }

      if (entryTypeIsCredit(data.entry_type) && data.payment_method !== "None") {
        throw new Error("Credit entries must use Payment Method: None");
      }

      if (entryTypeRequiresCashMovement(data.entry_type) && data.payment_method === "None") {
        throw new Error("This entry type requires actual payment");
      }

      // Sanitize inputs to prevent XSS
      const sanitizedData = sanitizeEntryInput(data);

      const shouldTrackRemaining = data.entry_type === "Credit" || data.entry_type === "Advance";

      const payload = {
        user_id: user.id,
        entry_type: sanitizedData.entry_type,
        category: sanitizedData.category,
        payment_method: entryTypeIsCredit(data.entry_type) ? "None" : sanitizedData.payment_method,
        amount,
        remaining_amount: shouldTrackRemaining ? amount : null,
        entry_date: sanitizedData.entry_date,
        notes: sanitizedData.notes,
        image_url: sanitizedData.image_url,
        party_id: sanitizedData.party_id || null,
      };

      const { error } = await supabase.from("entries").insert(payload);

      if (error) {
        console.error("Failed to insert entry", error);
        throw new Error(error.message);
      }

      revalidatePath("/daily-entries");
      revalidatePath("/analytics/cashpulse");
      revalidatePath("/analytics/profitlens");

      return { success: true };
    }
  );
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

  // Apply security wrapper
  return protectedAction(
    user.id,
    {
      rateLimitKey: 'update-entry',
      validateInputs: () => validateEntryInput(data)
    },
    async () => {
      const amount = Number(data.amount);

      if (!Number.isFinite(amount)) {
        throw new Error("Amount must be a valid number.");
      }

      if (entryTypeIsCredit(data.entry_type) && data.payment_method !== "None") {
        throw new Error("Credit entries must use Payment Method: None");
      }

      if (entryTypeRequiresCashMovement(data.entry_type) && data.payment_method === "None") {
        throw new Error("This entry type requires actual payment");
      }

      // Sanitize inputs
      const sanitizedData = sanitizeEntryInput(data);

      const shouldTrackRemaining = data.entry_type === "Credit" || data.entry_type === "Advance";

      const payload = {
        entry_type: sanitizedData.entry_type,
        category: sanitizedData.category,
        payment_method: entryTypeIsCredit(data.entry_type) ? "None" : sanitizedData.payment_method,
        amount,
        remaining_amount: shouldTrackRemaining ? amount : null,
        entry_date: sanitizedData.entry_date,
        notes: sanitizedData.notes,
        image_url: sanitizedData.image_url,
        party_id: sanitizedData.party_id || null,
      };

      const { error } = await supabase
        .from("entries")
        .update(payload)
        .eq("id", entryId)
        .eq("user_id", user.id); // Ensure user can only update their own entries

      if (error) {
        console.error("Failed to update entry", error);
        throw new Error(error.message);
      }

      revalidatePath("/daily-entries");
      revalidatePath("/analytics/cashpulse");
      revalidatePath("/analytics/profitlens");

      return { success: true };
    }
  );
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

  // Apply security wrapper (rate limiting + error handling, no validation needed for delete)
  return protectedAction(
    user.id,
    {
      rateLimitKey: 'delete-entry'
    },
    async () => {
      const { error } = await supabase
        .from("entries")
        .delete()
        .eq("id", entryId)
        .eq("user_id", user.id); // Ensure user can only delete their own entries

      if (error) {
        console.error("Failed to delete entry", error);
        throw new Error(error.message);
      }

      revalidatePath("/daily-entries");
      revalidatePath("/analytics/cashpulse");
      revalidatePath("/analytics/profitlens");

      return { success: true };
    }
  );
}
