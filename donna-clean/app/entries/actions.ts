"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { getOrRefreshUser } from "@/lib/supabase/get-user"
import { validateEntry } from "@/lib/validation"
import {
  sanitizeString,
  sanitizeAmount,
  sanitizeDate,
  isRateLimited
} from "@/lib/sanitization"
import type { SupabaseClient } from "@supabase/supabase-js"

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

// Helper function to generate alerts based on entry data
async function generateAlertsForEntry(
  supabase: SupabaseClient,
  userId: string,
  entry: { type: EntryType; category: string; amount: number; date: string }
) {
  try {
    // Fetch all entries for this user to calculate balances and trends
    const { data: allEntries, error: entriesError } = await supabase
      .from('entries')
      .select('type, amount, date')
      .eq('user_id', userId)

    if (entriesError || !allEntries) {
      console.error('Failed to fetch entries for alert generation:', entriesError)
      return
    }

    // Calculate current balance
    const balance = allEntries.reduce((sum, e) => {
      return e.type === 'income' ? sum + e.amount : sum - e.amount
    }, 0)

    // Calculate monthly totals
    const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM
    const monthlyEntries = allEntries.filter(e => e.date.startsWith(currentMonth))
    const monthlyIncome = monthlyEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0)
    const monthlyExpenses = monthlyEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0)

    const alerts: Array<{
      user_id: string
      type: 'critical' | 'warning' | 'info'
      priority: number
      title: string
      message: string
      is_read: boolean
    }> = []

    // Alert 1: High single expense (> ₹50,000)
    if (entry.type === 'expense' && entry.amount > 50000) {
      alerts.push({
        user_id: userId,
        type: 'warning',
        priority: 7,
        title: 'High Expense Recorded',
        message: `A large expense of ₹${entry.amount.toLocaleString('en-IN')} was recorded in category "${entry.category}". Please review if this is expected.`,
        is_read: false,
      })
    }

    // Alert 2: Low cash balance (< ₹10,000)
    if (balance < 10000 && balance >= 0) {
      alerts.push({
        user_id: userId,
        type: 'critical',
        priority: 9,
        title: 'Low Cash Balance',
        message: `Your current balance is ₹${balance.toLocaleString('en-IN')}. Consider reviewing expenses or increasing income.`,
        is_read: false,
      })
    }

    // Alert 3: Negative balance
    if (balance < 0) {
      alerts.push({
        user_id: userId,
        type: 'critical',
        priority: 10,
        title: 'Negative Balance Alert',
        message: `Your account balance is negative: ₹${balance.toLocaleString('en-IN')}. Immediate attention required.`,
        is_read: false,
      })
    }

    // Alert 4: Monthly expenses exceed income
    if (monthlyExpenses > monthlyIncome && monthlyIncome > 0) {
      const difference = monthlyExpenses - monthlyIncome
      alerts.push({
        user_id: userId,
        type: 'warning',
        priority: 8,
        title: 'Monthly Expenses Exceed Income',
        message: `This month's expenses (₹${monthlyExpenses.toLocaleString('en-IN')}) exceed income (₹${monthlyIncome.toLocaleString('en-IN')}) by ₹${difference.toLocaleString('en-IN')}.`,
        is_read: false,
      })
    }

    // Alert 5: Expenses significantly exceed income (>150%)
    if (monthlyIncome > 0 && monthlyExpenses > monthlyIncome * 1.5) {
      alerts.push({
        user_id: userId,
        type: 'critical',
        priority: 9,
        title: 'Excessive Spending Alert',
        message: `Your monthly expenses are ${((monthlyExpenses / monthlyIncome) * 100).toFixed(0)}% of your income. This is not sustainable.`,
        is_read: false,
      })
    }

    // Insert alerts into database (only if there are any)
    if (alerts.length > 0) {
      const { error: insertError } = await supabase
        .from('alerts')
        .insert(alerts)

      if (insertError) {
        console.error('Failed to insert alerts:', insertError)
      }
    }
  } catch (error) {
    console.error('Error in generateAlertsForEntry:', error)
  }
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

  // Rate limiting: 100 entries per day per user
  const rateLimitKey = `create-entry:${user.id}`
  if (isRateLimited(rateLimitKey, 100, 24 * 60 * 60 * 1000)) {
    return { success: false, error: "Rate limit exceeded. Maximum 100 entries per day." }
  }

  // Sanitize inputs
  const sanitizedData = {
    type: input.type,
    category: sanitizeString(input.category, 50),
    amount: sanitizeAmount(input.amount),
    description: input.description ? sanitizeString(input.description, 500) : undefined,
    date: sanitizeDate(input.date),
    payment_method: input.payment_method,
    notes: input.notes ? sanitizeString(input.notes, 1000) : undefined,
  }

  // Comprehensive validation
  const validation = validateEntry(sanitizedData)
  if (!validation.isValid) {
    console.error('Validation failed:', validation.error)
    return { success: false, error: validation.error }
  }

  const payload = {
    user_id: user.id,
    type: sanitizedData.type,
    category: sanitizedData.category,
    amount: sanitizedData.amount,
    description: sanitizedData.description || null,
    date: sanitizedData.date,
    payment_method: sanitizedData.payment_method || null,
    notes: sanitizedData.notes || null,
  }

  const { error } = await supabase
    .from('entries')
    .insert(payload)

  if (error) {
    console.error('Failed to create entry:', error)
    return { success: false, error: error.message }
  }

  // Generate alerts based on entry data
  await generateAlertsForEntry(supabase, user.id, sanitizedData)

  console.log('🔄 [CREATE ENTRY] REVALIDATING PATHS...')
  revalidatePath('/entries')
  revalidatePath('/cashpulse')
  revalidatePath('/profit-lens')
  revalidatePath('/analytics/cashpulse')
  revalidatePath('/analytics/profitlens')
  revalidatePath('/home')
  console.log('✅ [CREATE ENTRY] REVALIDATION COMPLETE')

  return { success: true, error: null }
}

export async function updateEntry(id: string, input: UpdateEntryInput) {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Rate limiting: 1000 updates per hour per user
  const rateLimitKey = `update-entry:${user.id}`
  if (isRateLimited(rateLimitKey, 1000, 60 * 60 * 1000)) {
    return { success: false, error: "Rate limit exceeded. Maximum 1000 updates per hour." }
  }

  // Sanitize inputs
  const payload: Record<string, unknown> = {}

  if (input.type) {
    payload.type = input.type
  }

  if (input.category) {
    payload.category = sanitizeString(input.category, 50)
  }

  if (input.amount !== undefined) {
    payload.amount = sanitizeAmount(input.amount)
  }

  if (input.description !== undefined) {
    payload.description = input.description ? sanitizeString(input.description, 500) : null
  }

  if (input.date) {
    payload.date = sanitizeDate(input.date)
  }

  if (input.payment_method !== undefined) {
    payload.payment_method = input.payment_method || null
  }

  if (input.notes !== undefined) {
    payload.notes = input.notes ? sanitizeString(input.notes, 1000) : null
  }

  // Validate the update data (if we have enough fields)
  if (Object.keys(payload).length > 0) {
    // Fetch current entry to merge with updates for validation
    const { data: currentEntry } = await supabase
      .from('entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (currentEntry) {
      const mergedData = { ...currentEntry, ...payload }
      const validation = validateEntry(mergedData)
      if (!validation.isValid) {
        console.error('Validation failed:', validation.error)
        return { success: false, error: validation.error }
      }
    }
  }

  const { error } = await supabase
    .from('entries')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to update entry:', error)
    return { success: false, error: error.message }
  }

  console.log('🔄 [UPDATE ENTRY] REVALIDATING PATHS...')
  revalidatePath('/entries')
  revalidatePath('/cashpulse')
  revalidatePath('/profit-lens')
  revalidatePath('/analytics/cashpulse')
  revalidatePath('/analytics/profitlens')
  revalidatePath('/home')
  console.log('✅ [UPDATE ENTRY] REVALIDATION COMPLETE')

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

  console.log('🔄 [DELETE ENTRY] REVALIDATING PATHS...')
  revalidatePath('/entries')
  revalidatePath('/cashpulse')
  revalidatePath('/profit-lens')
  revalidatePath('/analytics/cashpulse')
  revalidatePath('/analytics/profitlens')
  revalidatePath('/home')
  console.log('✅ [DELETE ENTRY] REVALIDATION COMPLETE')

  return { success: true, error: null }
}
