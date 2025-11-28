"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { getOrRefreshUser } from "@/lib/supabase/get-user"

export type AlertType = 'info' | 'warning' | 'critical'

export type Alert = {
  id: string
  user_id: string
  title: string
  message: string
  type: AlertType
  priority: number
  is_read: boolean
  related_entity_type: string | null
  related_entity_id: string | null
  created_at: string
  read_at: string | null
}

// Get all alerts for current user
export async function getAlerts() {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { alerts: [], error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('is_read', { ascending: true })  // Unread first
    .order('priority', { ascending: false }) // High priority first
    .order('created_at', { ascending: false }) // Newest first

  if (error) {
    console.error('Failed to fetch alerts:', error)
    return { alerts: [], error: error.message }
  }

  return { alerts: data as Alert[], error: null }
}

// Mark alert as read
export async function markAlertAsRead(alertId: string) {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from('alerts')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to mark alert as read:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/notifications')

  return { success: true, error: null }
}

// Mark all alerts as read
export async function markAllAlertsAsRead() {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from('alerts')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('Failed to mark all alerts as read:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/notifications')

  return { success: true, error: null }
}

// Delete alert
export async function deleteAlert(alertId: string) {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to delete alert:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/notifications')

  return { success: true, error: null }
}

// Delete all read alerts
export async function deleteAllReadAlerts() {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('user_id', user.id)
    .eq('is_read', true)

  if (error) {
    console.error('Failed to delete read alerts:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/notifications')

  return { success: true, error: null }
}

// Get alert counts
export async function getAlertCounts() {
  const supabase = await createSupabaseServerClient()
  const { user } = await getOrRefreshUser(supabase)

  if (!user) {
    return {
      total: 0,
      unread: 0,
      info: 0,
      warning: 0,
      critical: 0,
    }
  }

  const { data } = await supabase
    .from('alerts')
    .select('type, is_read')
    .eq('user_id', user.id)

  if (!data) {
    return {
      total: 0,
      unread: 0,
      info: 0,
      warning: 0,
      critical: 0,
    }
  }

  return {
    total: data.length,
    unread: data.filter(a => !a.is_read).length,
    info: data.filter(a => a.type === 'info').length,
    warning: data.filter(a => a.type === 'warning').length,
    critical: data.filter(a => a.type === 'critical').length,
  }
}
