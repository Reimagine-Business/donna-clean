"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { type EntryType, type CategoryType, type PaymentMethod } from "@/lib/entries";
import { createSupabaseServerClient } from "@/utils/supabase/server";

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
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Then continue with your queries using this supabase client

  const amount = Number(data.amount);

  if (Number.isNaN(amount)) {
    return { error: "Amount must be a valid number." };
  }

  console.log("Inserting with user_id:", user.id);

  const payload = {
    user_id: user.id,
    entry_type: data.entry_type,
    category: data.category,
    payment_method: data.payment_method,
    amount,
    entry_date: data.entry_date,
    notes: data.notes,
    image_url: data.image_url,
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
  revalidatePath("/cashpulse");
  revalidatePath("/profit-lens");

  return { success: true };
}
