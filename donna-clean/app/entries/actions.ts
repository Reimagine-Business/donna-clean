"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { getOrRefreshUser } from "@/lib/supabase/get-user"
import { validateEntry } from "@/lib/validation"
import {
  sanitizeString,
  sanitizeAmount,
  sanitizeDate
} from "@/lib/sanitization"
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit"
import * as Sentry from "@sentry/nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
// Re-export Entry type from canonical location
import type { Entry as LibEntry } from "@/lib/entries"

export type EntryType = 'Cash IN' | 'Cash OUT' | 'Credit' | 'Advance'
export type CategoryType = 'Sales' | 'COGS' | 'Opex' | 'Assets'
export type PaymentMethodType = 'Cash' | 'Bank' | 'None'

export type CreateEntryInput = {
  entry_type: EntryType
  category: CategoryType
  amount: number
  entry_date: string
  payment_method?: PaymentMethodType
  party_id?: string
  notes?: string
  settled?: boolean
  image_url?: string
}

export type UpdateEntryInput = Partial<CreateEntryInput>

// Re-export Entry type with optional is_settlement field for settlements
export type Entry = LibEntry & {
  is_settlement?: boolean
}

export type Category = {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  color: string
  icon: string
  created_at: string
}

// Helper function to generate alerts based on entry data
async function generateAlertsForEntry(
  supabase: SupabaseClient,
  userId: string,
  entry: { entry_type: EntryType; category: CategoryType; amount: number; entry_date: string }
) {
  try {
    // Fetch all entries for this user to calculate balances and trends
    const { data: allEntries, error: entriesError } = await supabase
      .from('entries')
      .select('entry_type, category, amount, entry_date')
      .eq('user_id', userId)

    if (entriesError || !allEntries) {
      console.error('Failed to fetch entries for alert generation:', entriesError)
      return
    }

    // Calculate Cash Pulse balance (Cash IN/OUT + Advance only)
    const cashIn = allEntries
      .filter(e =>
        e.entry_type === 'Cash IN' ||
        (e.entry_type === 'Advance' && e.category === 'Sales')
      )
      .reduce((sum, e) => sum + e.amount, 0)
    const cashOut = allEntries
      .filter(e =>
        e.entry_type === 'Cash OUT' ||
        (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category))
      )
      .reduce((sum, e) => sum + e.amount, 0)
    const balance = cashIn - cashOut

    // Calculate monthly Profit Lens totals (Cash + Credit, no Advance)
    const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM
    const monthlyEntries = allEntries.filter(e => e.entry_date.startsWith(currentMonth))
    const monthlyRevenue = monthlyEntries
      .filter(e =>
        e.category === 'Sales' &&
        (e.entry_type === 'Cash IN' || e.entry_type === 'Credit')
      )
      .reduce((sum, e) => sum + e.amount, 0)
    const monthlyExpenses = monthlyEntries
      .filter(e =>
        ['COGS', 'Opex'].includes(e.category) &&
        (e.entry_type === 'Cash OUT' || e.entry_type === 'Credit')
      )
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
    if (['COGS', 'Opex', 'Assets'].includes(entry.category) && entry.amount > 50000) {
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
        message: `Your current Cash Pulse balance is ₹${balance.toLocaleString('en-IN')}. Consider reviewing cash outflows.`,
        is_read: false,
      })
    }

    // Alert 3: Negative balance
    if (balance < 0) {
      alerts.push({
        user_id: userId,
        type: 'critical',
        priority: 10,
        title: 'Negative Cash Balance Alert',
        message: `Your Cash Pulse balance is negative: ₹${balance.toLocaleString('en-IN')}. Immediate attention required.`,
        is_read: false,
      })
    }

    // Alert 4: Monthly expenses exceed revenue (Profit Lens)
    if (monthlyExpenses > monthlyRevenue && monthlyRevenue > 0) {
      const difference = monthlyExpenses - monthlyRevenue
      alerts.push({
        user_id: userId,
        type: 'warning',
        priority: 8,
        title: 'Monthly Expenses Exceed Revenue',
        message: `This month's expenses (₹${monthlyExpenses.toLocaleString('en-IN')}) exceed revenue (₹${monthlyRevenue.toLocaleString('en-IN')}) by ₹${difference.toLocaleString('en-IN')}.`,
        is_read: false,
      })
    }

    // Alert 5: Expenses significantly exceed revenue (>150%)
    if (monthlyRevenue > 0 && monthlyExpenses > monthlyRevenue * 1.5) {
      alerts.push({
        user_id: userId,
        type: 'critical',
        priority: 9,
        title: 'Excessive Spending Alert',
        message: `Your monthly expenses are ${((monthlyExpenses / monthlyRevenue) * 100).toFixed(0)}% of your revenue. This is not sustainable.`,
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
  try {
    console.log('🔄 [GET_ENTRIES] Starting data fetch...')

    const supabase = await createSupabaseServerClient()
    console.log('✅ [GET_ENTRIES] Supabase client created')

    const { user } = await getOrRefreshUser(supabase)
    console.log('🔍 [GET_ENTRIES] User authentication check:', user ? `User ID: ${user.id}` : 'No user')

    if (!user) {
      console.error('❌ [GET_ENTRIES] Not authenticated')
      return { entries: [], error: "Not authenticated" }
    }

    console.log('🔍 [GET_ENTRIES] Fetching entries for user:', user.id)
    console.log('📅 [GET_ENTRIES] Query: SELECT entries with party info WHERE user_id =', user.id)

    const { data, error } = await supabase
      .from('entries')
      .select(`
        *,
        party:parties(name)
      `)
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [GET_ENTRIES] Supabase query error:', error)
      console.error('❌ [GET_ENTRIES] Error details:', JSON.stringify(error, null, 2))
      return { entries: [], error: error.message }
    }

    console.log('✅ [GET_ENTRIES] Query successful')
    console.log('📊 [GET_ENTRIES] Total entries fetched:', data?.length || 0)

    if (data && data.length > 0) {
      console.log('📊 [GET_ENTRIES] Entry breakdown:', {
        total: data.length,
        cashIn: data.filter(e => e.entry_type === 'Cash IN').length,
        cashOut: data.filter(e => e.entry_type === 'Cash OUT').length,
        credit: data.filter(e => e.entry_type === 'Credit').length,
        advance: data.filter(e => e.entry_type === 'Advance').length,
      })
      console.log('📊 [GET_ENTRIES] Category breakdown:', {
        sales: data.filter(e => e.category === 'Sales').length,
        cogs: data.filter(e => e.category === 'COGS').length,
        opex: data.filter(e => e.category === 'Opex').length,
        assets: data.filter(e => e.category === 'Assets').length,
      })
      console.log('📊 [GET_ENTRIES] First 3 entries:', data.slice(0, 3).map(e => ({
        id: e.id.substring(0, 8),
        type: e.entry_type,
        category: e.category,
        amount: e.amount,
        date: e.entry_date,
        settled: e.settled,
      })))
    } else {
      console.warn('⚠️ [GET_ENTRIES] No entries found in database')
    }

    return { entries: data as Entry[], error: null }
  } catch (error) {
    console.error('❌ [GET_ENTRIES] Unexpected error:', error)
    console.error('❌ [GET_ENTRIES] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return { entries: [], error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

export async function getCategories() {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { categories: [], error: "Not authenticated" }
  }

  // Return hardcoded categories with default styling
  // This ensures the form always works even without DB seeding
  const categories: Category[] = [
    {
      id: 'cat-sales',
      user_id: user.id,
      name: 'Sales',
      type: 'income',
      color: '#10b981',
      icon: 'TrendingUp',
      created_at: new Date().toISOString()
    },
    {
      id: 'cat-cogs',
      user_id: user.id,
      name: 'COGS',
      type: 'expense',
      color: '#ef4444',
      icon: 'ShoppingCart',
      created_at: new Date().toISOString()
    },
    {
      id: 'cat-opex',
      user_id: user.id,
      name: 'Opex',
      type: 'expense',
      color: '#f59e0b',
      icon: 'Briefcase',
      created_at: new Date().toISOString()
    },
    {
      id: 'cat-assets',
      user_id: user.id,
      name: 'Assets',
      type: 'expense',
      color: '#8b5cf6',
      icon: 'Package',
      created_at: new Date().toISOString()
    }
  ]

  return { categories, error: null }
}

export async function createEntry(input: CreateEntryInput) {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Rate limiting: 100 entries per day per user (using Vercel KV)
  try {
    await checkRateLimit(user.id, 'create-entry')
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { success: false, error: error.message }
    }
    // If rate limit check fails (e.g., KV down), allow the request
    console.error('Rate limit check failed:', error)
    Sentry.captureException(error, {
      tags: { action: 'create-entry-rate-limit', userId: user.id },
      level: 'warning',
    })
  }

  // Sanitize inputs
  const sanitizedData = {
    entry_type: input.entry_type,
    category: input.category,
    amount: sanitizeAmount(input.amount),
    entry_date: sanitizeDate(input.entry_date),
    payment_method: input.payment_method || 'Cash',
    party_id: input.party_id || null,
    notes: input.notes ? sanitizeString(input.notes, 1000) : undefined,
    settled: input.settled || false,
    image_url: input.image_url,
  }

  // Comprehensive validation
  const validation = validateEntry(sanitizedData)
  if (!validation.isValid) {
    console.error('Validation failed:', validation.error)
    return { success: false, error: validation.error }
  }

  const payload = {
    user_id: user.id,
    entry_type: sanitizedData.entry_type,
    category: sanitizedData.category,
    amount: sanitizedData.amount,
    entry_date: sanitizedData.entry_date,
    payment_method: sanitizedData.payment_method,
    party_id: sanitizedData.party_id,
    notes: sanitizedData.notes || null,
    settled: sanitizedData.settled,
    image_url: sanitizedData.image_url || null,
  }

  const { error } = await supabase
    .from('entries')
    .insert(payload)

  if (error) {
    console.error('Failed to create entry:', error)
    Sentry.captureException(error, {
      tags: { action: 'create-entry', userId: user.id },
      extra: { entryData: sanitizedData },
      level: 'error',
    })
    return { success: false, error: error.message }
  }

  // Generate alerts based on entry data
  await generateAlertsForEntry(supabase, user.id, sanitizedData)

  console.log('🔄 [CREATE ENTRY] REVALIDATING PATHS...')
  revalidatePath('/entries')
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

  // Rate limiting: 200 updates per hour per user (using Vercel KV)
  try {
    await checkRateLimit(user.id, 'update-entry')
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { success: false, error: error.message }
    }
    console.error('Rate limit check failed:', error)
    Sentry.captureException(error, {
      tags: { action: 'update-entry-rate-limit', userId: user.id },
      level: 'warning',
    })
  }

  // Sanitize inputs
  const payload: Record<string, unknown> = {}

  if (input.entry_type) {
    payload.entry_type = input.entry_type
  }

  if (input.category) {
    payload.category = input.category
  }

  if (input.amount !== undefined) {
    payload.amount = sanitizeAmount(input.amount)
  }

  if (input.entry_date) {
    payload.entry_date = sanitizeDate(input.entry_date)
  }

  if (input.payment_method !== undefined) {
    payload.payment_method = input.payment_method
  }

  if (input.notes !== undefined) {
    payload.notes = input.notes ? sanitizeString(input.notes, 1000) : null
  }

  if (input.settled !== undefined) {
    payload.settled = input.settled
  }

  if (input.image_url !== undefined) {
    payload.image_url = input.image_url || null
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
    Sentry.captureException(error, {
      tags: { action: 'update-entry', userId: user.id, entryId: id },
      extra: { updateData: payload },
      level: 'error',
    })
    return { success: false, error: error.message }
  }

  console.log('🔄 [UPDATE ENTRY] REVALIDATING PATHS...')
  revalidatePath('/entries')
  revalidatePath('/analytics/cashpulse')
  revalidatePath('/analytics/profitlens')
  revalidatePath('/home')
  console.log('✅ [UPDATE ENTRY] REVALIDATION COMPLETE')

  return { success: true, error: null }
}

/**
 * Deletes an entry and reverses ALL impacts on dashboards.
 *
 * For settled Credit entries:
 * - Deletes the original Credit entry
 * - Also deletes the Cash IN/OUT settlement entry that was created
 * - Reverses impacts on: Cash Pulse, Profit Lens, Pending boxes, Settlement History
 *
 * For settled Advance entries:
 * - Deletes the original Advance entry
 * - No settlement entry to delete (Advance doesn't create new entry on settlement)
 * - Reverses impacts on: Cash Pulse, Profit Lens, Advance boxes, Settlement History
 *
 * For unsettled entries:
 * - Simply deletes the entry
 * - Reverses impacts on: Cash Pulse (for Cash/Advance), Profit Lens, Pending boxes
 */
export async function deleteEntry(id: string) {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // First, get the entry to check if it's settled and its type
  const { data: entry, error: fetchError } = await supabase
    .from('entries')
    .select('id, user_id, entry_type, category, settled, amount')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !entry) {
    console.error('Failed to fetch entry for deletion:', fetchError)
    if (fetchError) {
      Sentry.captureException(fetchError, {
        tags: { action: 'delete-entry-fetch', userId: user.id, entryId: id },
        level: 'error',
      })
    }
    return { success: false, error: 'Entry not found or no longer accessible' }
  }

  // If entry is settled, we need to handle associated settlement entries
  if (entry.settled) {
    // For Credit entries, delete the Cash IN/OUT settlement entry
    if (entry.entry_type === 'Credit') {
      // Find and delete the settlement Cash entry
      // It will have notes like "Settlement of credit sales (original_entry_id)"
      const settlementNotePattern = `Settlement of credit ${entry.category.toLowerCase()} (${id})`;

      const { error: deleteSettlementError } = await supabase
        .from('entries')
        .delete()
        .eq('user_id', user.id)
        .eq('notes', settlementNotePattern);

      if (deleteSettlementError) {
        console.error('Failed to delete settlement entry:', deleteSettlementError)
        Sentry.captureException(deleteSettlementError, {
          tags: { action: 'delete-entry-settlement', userId: user.id, entryId: id },
          extra: { entryType: entry.entry_type, category: entry.category },
          level: 'warning',
        })
        // Continue anyway - we'll still delete the original entry
      } else {
        console.log(`✅ Deleted associated settlement entry for Credit ${entry.category}`)
      }
    }
    // For Advance entries, no settlement entry to delete (just marks as settled)
    // So we only need to delete the original entry
  }

  // Now delete the original entry
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to delete entry:', error)
    Sentry.captureException(error, {
      tags: { action: 'delete-entry', userId: user.id, entryId: id },
      extra: { entryType: entry.entry_type, settled: entry.settled },
      level: 'error',
    })
    return { success: false, error: error.message }
  }

  console.log('🔄 [DELETE ENTRY] REVALIDATING PATHS...')
  revalidatePath('/entries')
  revalidatePath('/analytics/cashpulse')
  revalidatePath('/analytics/profitlens')
  revalidatePath('/home')
  console.log('✅ [DELETE ENTRY] REVALIDATION COMPLETE')

  return { success: true, error: null }
}
