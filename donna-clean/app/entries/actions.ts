"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { getOrRefreshUser } from "@/lib/supabase/get-user"

export type EntryType = 'income' | 'expense'
export type PaymentMethodType = 'cash' | 'bank' | 'upi' | 'card' | 'cheque' | 'other'

export type CreateEntryInput = {
  type: EntryType
  category: string
  amount: number
  description?: string
  date: string
  payment_method?: PaymentMethodType
  notes?: string
}

export type UpdateEntryInput = Partial<CreateEntryInput>

export type Entry = {
  id: string
  user_id: string
  type: EntryType
  category: string
  amount: number
  description: string | null
  date: string
  payment_method: PaymentMethodType | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Category = {
  id: string
  user_id: string
  name: string
  type: EntryType
  color: string
  icon: string
  created_at: string
}

export async function getEntries() {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { entries: [], error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch entries:', error)
    return { entries: [], error: error.message }
  }

  return { entries: data as Entry[], error: null }
}

export async function getCategories() {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { categories: [], error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch categories:', error)
    return { categories: [], error: error.message }
  }

  return { categories: data as Category[], error: null }
}

export async function createEntry(input: CreateEntryInput) {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Validate amount
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Amount must be a positive number" }
  }

  // Validate date (not in future)
  const entryDate = new Date(input.date)
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  if (entryDate > today) {
    return { success: false, error: "Date cannot be in the future" }
  }

  // Validate required fields
  if (!input.type || !input.category) {
    return { success: false, error: "Type and category are required" }
  }

  const payload = {
    user_id: user.id,
    type: input.type,
    category: input.category,
    amount,
    description: input.description || null,
    date: input.date,
    payment_method: input.payment_method || null,
    notes: input.notes || null,
  }

  const { error } = await supabase
    .from('entries')
    .insert(payload)

  if (error) {
    console.error('Failed to create entry:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/entries')
  revalidatePath('/cashpulse')
  revalidatePath('/profit-lens')

  return { success: true, error: null }
}

export async function updateEntry(id: string, input: UpdateEntryInput) {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Validate amount if provided
  if (input.amount !== undefined) {
    const amount = Number(input.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Amount must be a positive number" }
    }
  }

  // Validate date if provided (not in future)
  if (input.date) {
    const entryDate = new Date(input.date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    if (entryDate > today) {
      return { success: false, error: "Date cannot be in the future" }
    }
  }

  const payload: any = {}
  if (input.type) payload.type = input.type
  if (input.category) payload.category = input.category
  if (input.amount !== undefined) payload.amount = Number(input.amount)
  if (input.description !== undefined) payload.description = input.description || null
  if (input.date) payload.date = input.date
  if (input.payment_method !== undefined) payload.payment_method = input.payment_method || null
  if (input.notes !== undefined) payload.notes = input.notes || null

  const { error } = await supabase
    .from('entries')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to update entry:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/entries')
  revalidatePath('/cashpulse')
  revalidatePath('/profit-lens')

  return { success: true, error: null }
}

export async function deleteEntry(id: string) {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to delete entry:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/entries')
  revalidatePath('/cashpulse')
  revalidatePath('/profit-lens')

  return { success: true, error: null }
}
