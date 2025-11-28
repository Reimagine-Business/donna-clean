'use client'

import { useState, useMemo } from 'react'
import { Filter, Search } from 'lucide-react'
import { type Alert, type AlertType } from '@/app/notifications/actions'
import { AlertCard } from './alert-card'
import { AlertSummary } from './alert-summary'

interface NotificationsShellProps {
  initialAlerts: Alert[]
  counts: {
    total: number
    unread: number
    info: number
    warning: number
    critical: number
  }
  onRefresh: () => void
}

export function NotificationsShell({ initialAlerts, counts, onRefresh }: NotificationsShellProps) {
  const [alerts] = useState<Alert[]>(initialAlerts)
  const [filterType, setFilterType] = useState<'all' | AlertType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter and search alerts
  const filteredAlerts = useMemo(() => {
    let result = alerts

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(alert => alert.type === filterType)
    }

    // Search by title or message
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        alert =>
          alert.title.toLowerCase().includes(query) ||
          alert.message.toLowerCase().includes(query)
      )
    }

    return result
  }, [alerts, filterType, searchQuery])

  // Separate unread and read
  const unreadAlerts = useMemo(() => filteredAlerts.filter(a => !a.is_read), [filteredAlerts])
  const readAlerts = useMemo(() => filteredAlerts.filter(a => a.is_read), [filteredAlerts])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Notifications</h1>
        <p className="text-purple-300 mt-1">Stay updated on your business alerts</p>
      </div>

      {/* Summary */}
      <AlertSummary
        total={counts.total}
        unread={counts.unread}
        info={counts.info}
        warning={counts.warning}
        critical={counts.critical}
        onUpdate={onRefresh}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-purple-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts..."
            className="w-full pl-10 pr-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Unread Alerts */}
      {unreadAlerts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            Unread Alerts
            <span className="text-sm font-normal text-purple-400">({unreadAlerts.length})</span>
          </h2>
          <div className="space-y-3">
            {unreadAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onUpdate={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {/* Read Alerts */}
      {readAlerts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            Read Alerts
            <span className="text-sm font-normal text-purple-400">({readAlerts.length})</span>
          </h2>
          <div className="space-y-3">
            {readAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onUpdate={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredAlerts.length === 0 && (
        <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <h3 className="text-xl font-semibold text-white mb-2">No alerts found</h3>
          <p className="text-purple-400">
            {searchQuery
              ? 'No alerts match your search criteria'
              : filterType !== 'all'
              ? `No ${filterType} alerts at the moment`
              : "You're all caught up!"}
          </p>
        </div>
      )}
    </div>
  )
}
