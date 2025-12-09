'use client'

import { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, X, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { markAlertAsRead, deleteAlert } from '@/app/notifications/actions'
import { showSuccess, showError } from '@/lib/toast'
import { ViewAllAlertsModal } from './view-all-alerts-modal'

interface Alert {
  id: string
  user_id: string
  type: 'critical' | 'warning' | 'info'
  priority: number
  title: string
  message: string
  is_read: boolean
  created_at: string
}

interface AlertsSectionProps {
  initialAlerts: Alert[]
  userId: string
}

export function AlertsSection({ initialAlerts, userId }: AlertsSectionProps) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleMarkAsRead = async (alertId: string) => {
    try {
      const result = await markAlertAsRead(alertId)

      if (result.success) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId))
        showSuccess('Alert marked as read')
      } else {
        showError(result.error || 'Failed to mark as read')
      }
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An unexpected error occurred')
    }
  }

  const handleDismiss = async (alertId: string) => {
    try {
      const result = await deleteAlert(alertId)

      if (result.success) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId))
        showSuccess('Alert dismissed')
      } else {
        showError(result.error || 'Failed to dismiss alert')
      }
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An unexpected error occurred')
    }
  }

  const getAlertConfig = (type: string) => {
    switch (type) {
      case 'critical':
        return {
          icon: <AlertCircle className="w-6 h-6 md:w-8 md:h-8" />,
          bg: 'bg-gradient-to-r from-red-900/40 to-red-800/40',
          border: 'border-red-500/50',
          iconColor: 'text-red-400',
          textColor: 'text-red-100',
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 md:w-8 md:h-8" />,
          bg: 'bg-gradient-to-r from-orange-900/40 to-orange-800/40',
          border: 'border-orange-500/50',
          iconColor: 'text-orange-400',
          textColor: 'text-orange-100',
        }
      default:
        return {
          icon: <Info className="w-6 h-6 md:w-8 md:h-8" />,
          bg: 'bg-gradient-to-r from-blue-900/40 to-blue-800/40',
          border: 'border-blue-500/50',
          iconColor: 'text-blue-400',
          textColor: 'text-blue-100',
        }
    }
  }

  // Show top 5 alerts
  const displayAlerts = alerts.slice(0, 5)

  if (alerts.length === 0) {
    return (
      <section className="mb-6">
        <div className="bg-gradient-to-r from-green-900/20 to-green-800/20 border border-green-500/30 rounded-lg p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-green-100 mb-1">
                ✅ All Good!
              </h3>
              <p className="text-green-200 text-sm md:text-base">
                No urgent issues need your attention.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white">
          🚨 Needs Your Attention
        </h2>
        {alerts.length > 5 && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-purple-400 hover:text-purple-300 text-sm md:text-base font-medium transition-colors"
          >
            View All ({alerts.length})
          </button>
        )}
      </div>

      <div className="space-y-3 md:space-y-4">
        {displayAlerts.map((alert) => {
          const config = getAlertConfig(alert.type)

          return (
            <div
              key={alert.id}
              className={`${config.bg} border ${config.border} rounded-lg p-4 md:p-6 transition-all hover:scale-[1.01]`}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className={config.iconColor}>
                    {config.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className={`font-bold text-base md:text-lg ${config.textColor}`}>
                      {alert.title}
                    </h3>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
                      aria-label="Dismiss"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-white text-sm md:text-base mb-3">
                    {alert.message}
                  </p>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs md:text-sm text-gray-400">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>

                    <button
                      onClick={() => handleMarkAsRead(alert.id)}
                      className="px-3 py-1 md:px-4 md:py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xs md:text-sm font-medium transition-colors"
                    >
                      Mark as Read
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {alerts.length > 5 && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full mt-4 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          View All Alerts ({alerts.length})
        </button>
      )}

      <ViewAllAlertsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        alerts={alerts}
        onMarkAsRead={handleMarkAsRead}
        onDismiss={handleDismiss}
      />
    </section>
  )
}
