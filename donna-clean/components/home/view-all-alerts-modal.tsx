'use client'

import { X, AlertCircle, AlertTriangle, Info, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

interface ViewAllAlertsModalProps {
  isOpen: boolean
  onClose: () => void
  alerts: Alert[]
  onMarkAsRead: (alertId: string) => void
  onDismiss: (alertId: string) => void
}

export function ViewAllAlertsModal({
  isOpen,
  onClose,
  alerts,
  onMarkAsRead,
  onDismiss,
}: ViewAllAlertsModalProps) {
  if (!isOpen) return null

  const getAlertConfig = (type: string) => {
    switch (type) {
      case 'critical':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          bg: 'bg-red-900/20',
          border: 'border-red-500/30',
          iconColor: 'text-red-400',
          textColor: 'text-red-100',
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          bg: 'bg-orange-900/20',
          border: 'border-orange-500/30',
          iconColor: 'text-orange-400',
          textColor: 'text-orange-100',
        }
      default:
        return {
          icon: <Info className="w-5 h-5" />,
          bg: 'bg-blue-900/20',
          border: 'border-blue-500/30',
          iconColor: 'text-blue-400',
          textColor: 'text-blue-100',
        }
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-[#1a1a2e] border-t md:border border-purple-500/30 rounded-t-2xl md:rounded-lg w-full md:max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/30 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            All Alerts ({alerts.length})
          </h2>
          <button
            onClick={onClose}
            className="text-purple-300 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Alerts List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 pb-32 md:pb-6">
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-gray-400">No alerts to display</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const config = getAlertConfig(alert.type)

                return (
                  <div
                    key={alert.id}
                    className={`${config.bg} border ${config.border} rounded-lg p-4`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className={config.iconColor}>
                          {config.icon}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className={`font-bold text-base ${config.textColor}`}>
                            {alert.title}
                          </h3>
                          <button
                            onClick={() => onDismiss(alert.id)}
                            className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
                            aria-label="Dismiss"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-white text-sm mb-3">
                          {alert.message}
                        </p>

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </span>

                          <button
                            onClick={() => onMarkAsRead(alert.id)}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xs font-medium transition-colors"
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
          )}
        </div>
      </div>
    </div>
  )
}
