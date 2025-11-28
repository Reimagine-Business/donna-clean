'use client'

import { useState } from 'react'
import { Bell, CheckCheck, Trash } from 'lucide-react'
import { markAllAlertsAsRead, deleteAllReadAlerts } from '@/app/notifications/actions'
import { showSuccess, showError } from '@/lib/toast'

interface AlertSummaryProps {
  total: number
  unread: number
  info: number
  warning: number
  critical: number
  onUpdate: () => void
}

export function AlertSummary({ total, unread, info, warning, critical, onUpdate }: AlertSummaryProps) {
  const [processing, setProcessing] = useState(false)

  const handleMarkAllAsRead = async () => {
    if (unread === 0) {
      showError('No unread alerts')
      return
    }

    setProcessing(true)

    try {
      const result = await markAllAlertsAsRead()

      if (result.success) {
        showSuccess('All alerts marked as read')
        onUpdate()
      } else {
        showError(result.error || 'Failed to mark all as read')
      }
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteAllRead = async () => {
    const readCount = total - unread

    if (readCount === 0) {
      showError('No read alerts to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete all ${readCount} read alerts?`)) {
      return
    }

    setProcessing(true)

    try {
      const result = await deleteAllReadAlerts()

      if (result.success) {
        showSuccess(`Deleted ${readCount} read alerts`)
        onUpdate()
      } else {
        showError(result.error || 'Failed to delete read alerts')
      }
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Alert Summary</h2>
        </div>
        {unread > 0 && (
          <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">
            {unread} unread
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-purple-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-xs text-purple-400">Total Alerts</div>
        </div>
        <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-400">{info}</div>
          <div className="text-xs text-blue-300">Info</div>
        </div>
        <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-500/30">
          <div className="text-2xl font-bold text-yellow-400">{warning}</div>
          <div className="text-xs text-yellow-300">Warnings</div>
        </div>
        <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
          <div className="text-2xl font-bold text-red-400">{critical}</div>
          <div className="text-xs text-red-300">Critical</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleMarkAllAsRead}
          disabled={processing || unread === 0}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark All as Read</span>
        </button>
        <button
          onClick={handleDeleteAllRead}
          disabled={processing || total === unread}
          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          <Trash className="w-4 h-4" />
          <span>Clear Read Alerts</span>
        </button>
      </div>
    </div>
  )
}
