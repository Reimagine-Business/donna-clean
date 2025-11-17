"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { type EntryType, type CategoryType, type PaymentMethod } from "@/lib/entries";

type AddEntryInput = {
  entry_type: EntryType;
  category: CategoryType;
  payment_method: PaymentMethod;
  amount: number;
  entry_date: string;
  notes: string | null;
  image_url: string | null;
};

export async function addEntry(data: AddEntryInput) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be signed in to add entries." };
  }

  const payload = {
    user_id: user.id,
    entry_type: data.entry_type,
    category: data.category,
    payment_method: data.payment_method,
    amount: Number(data.amount),
    entry_date: data.entry_date,
    notes: data.notes,
    image_url: data.image_url,
  };

  console.log("Insert payload:", payload);

  const { error } = await supabase.from("entries").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/daily-entries");
  revalidatePath("/cashpulse");
  revalidatePath("/profit-lens");

  return { success: true };
}
