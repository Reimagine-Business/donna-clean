"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export async function createReminder(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const title = formData.get("title") as string;
  const dueDate = formData.get("due_date") as string;

  // ✅ FIX: Check for existing pending reminder with same title and due date
  const { data: existing } = await supabase
    .from("reminders")
    .select("id")
    .eq("user_id", user.id)
    .eq("title", title)
    .eq("due_date", dueDate)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    console.log("⚠️ Duplicate reminder prevented:", { title, dueDate });
    return { error: "A reminder with this title and due date already exists" };
  }

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      user_id: user.id,
      title,
      description: formData.get("description"),
      due_date: dueDate,
      category: formData.get("category"),
      frequency: formData.get("frequency"),
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // If recurring, calculate next_due_date
  if (data.frequency !== "one_time") {
    const nextDueDate = calculateNextDueDate(data.due_date, data.frequency);
    await supabase
      .from("reminders")
      .update({ next_due_date: nextDueDate })
      .eq("id", data.id);
  }

  revalidatePath("/alerts");
  revalidatePath("/home");
  return { success: true, data };
}

export async function markReminderDone(reminderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get reminder details
  const { data: reminder } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", reminderId)
    .single();

  // Mark as completed
  const { error } = await supabase
    .from("reminders")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", reminderId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  // If recurring, create next occurrence
  if (reminder?.frequency !== "one_time") {
    const nextDueDate = calculateNextDueDate(reminder.due_date, reminder.frequency);

    // ✅ FIX: Check if next occurrence already exists before creating
    const { data: existingNext } = await supabase
      .from("reminders")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", reminder.title)
      .eq("due_date", nextDueDate)
      .eq("status", "pending")
      .maybeSingle();

    if (!existingNext) {
      // Only create if it doesn't already exist
      await supabase.from("reminders").insert({
        user_id: user.id,
        title: reminder.title,
        description: reminder.description,
        due_date: nextDueDate,
        category: reminder.category,
        frequency: reminder.frequency,
        status: "pending",
        parent_reminder_id: reminderId,
      });
      console.log("✅ Created next recurring reminder:", { title: reminder.title, nextDueDate });
    } else {
      console.log("⚠️ Next occurrence already exists, skipping:", { title: reminder.title, nextDueDate });
    }
  }

  revalidatePath("/alerts");
  revalidatePath("/home");
  return { success: true };
}

export async function updateReminder(reminderId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("reminders")
    .update({
      title: formData.get("title"),
      description: formData.get("description"),
      due_date: formData.get("due_date"),
      category: formData.get("category"),
      frequency: formData.get("frequency"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reminderId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/alerts");
  revalidatePath("/home");
  return { success: true };
}

export async function deleteReminder(reminderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", reminderId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/alerts");
  revalidatePath("/home");
  return { success: true };
}

function calculateNextDueDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);

  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "annually":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().split('T')[0];
}
