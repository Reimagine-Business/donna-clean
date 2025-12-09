'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Info, AlertTriangle, AlertCircle, Check, Trash2 } from 'lucide-react'
import { type Alert, markAlertAsRead, deleteAlert } from '@/app/notifications/actions'
import { showSuccess, showError } from '@/lib/toast'

interface AlertCardProps {
  alert: Alert
  onUpdate: () => void
}

export function AlertCard({ alert, onUpdate }: AlertCardProps) {
  const [processing, setProcessing] = useState(false)

  const handleMarkAsRead = async () => {
    setProcessing(true)

    try {
      const result = await markAlertAsRead(alert.id)

      if (result.success) {
        showSuccess('Alert marked as read')
        onUpdate()
      } else {
        showError(result.error || 'Failed to mark as read')
      }
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return
    }

    setProcessing(true)

    try {
      const result = await deleteAlert(alert.id)

      if (result.success) {
        showSuccess('Alert deleted')
        onUpdate()
      } else {
        showError(result.error || 'Failed to delete alert')
      }
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setProcessing(false)
    }
  }

  // Icon and colors based on type
  const getTypeConfig = () => {
    switch (alert.type) {
      case 'info':
        return {
          icon: <Info className="w-5 h-5" />,
          bg: alert.is_read ? 'bg-blue-900/10' : 'bg-blue-900/20',
          border: alert.is_read ? 'border-blue-500/20' : 'border-blue-500/50',
          iconColor: alert.is_read ? 'text-blue-400/50' : 'text-blue-400',
          label: '📘 Info',
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          bg: alert.is_read ? 'bg-yellow-900/10' : 'bg-yellow-900/20',
          border: alert.is_read ? 'border-yellow-500/20' : 'border-yellow-500/50',
          iconColor: alert.is_read ? 'text-yellow-400/50' : 'text-yellow-400',
          label: '⚠️ Warning',
        }
      case 'critical':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          bg: alert.is_read ? 'bg-red-900/10' : 'bg-red-900/20',
          border: alert.is_read ? 'border-red-500/20' : 'border-red-500/50',
          iconColor: alert.is_read ? 'text-red-400/50' : 'text-red-400',
          label: '🔴 Critical',
        }
    }
  }

  const config = getTypeConfig()
  const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })

  return (
    <div
      className={`${config.bg} border ${config.border} rounded-lg p-4 transition-all ${
        alert.is_read ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconColor}`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`font-semibold ${alert.is_read ? 'text-purple-300' : 'text-white'}`}>
              {alert.title}
            </h3>
            <span className="text-xs text-purple-400 whitespace-nowrap">
              {config.label}
            </span>
          </div>

          <p className={`text-sm mb-2 ${alert.is_read ? 'text-purple-400' : 'text-purple-200'}`}>
            {alert.message}
          </p>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-purple-500">
              {timeAgo}
            </span>

            <div className="flex items-center gap-2">
              {!alert.is_read && (
                <button
                  onClick={handleMarkAsRead}
                  disabled={processing}
                  className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark as read</span>
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={processing}
                className="text-xs px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
