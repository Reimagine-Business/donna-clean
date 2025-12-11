'use client'

import { useMemo } from 'react'
import { type Entry } from '@/lib/entries'
import { AlertTriangle, TrendingUp, Clock, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import { calculateCashBalance } from '@/lib/analytics-new'
import { differenceInDays, format } from 'date-fns'

interface BusinessInsightsProps {
  entries: Entry[]
}

interface Insight {
  id: string
  type: 'critical' | 'warning' | 'info' | 'success'
  icon: React.ReactNode
  title: string
  message: string
  priority: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function BusinessInsights({ entries }: BusinessInsightsProps) {
  const insights = useMemo<Insight[]>(() => {
    const insights: Insight[] = []
    const now = new Date()

    // 1. Critical - Low cash warning
    const cashBalance = calculateCashBalance(entries)
    if (cashBalance < 10000) {
      insights.push({
        id: 'low-cash',
        type: 'critical',
        icon: <AlertTriangle className="w-5 h-5" />,
        title: 'Low Cash Alert',
        message: `Cash balance is ${formatCurrency(cashBalance)}. Consider collecting pending payments.`,
        priority: 10,
      })
    }

    // 2. Warning - Overdue collections (Credit Sales > 30 days old)
    const overdueCollections = entries.filter(e =>
      e.entry_type === 'Credit' &&
      e.category === 'Sales' &&
      !e.settled &&
      differenceInDays(now, new Date(e.entry_date)) > 30
    )
    if (overdueCollections.length > 0) {
      const totalOverdue = overdueCollections.reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0)
      insights.push({
        id: 'overdue-collections',
        type: 'warning',
        icon: <Clock className="w-5 h-5" />,
        title: 'Overdue Collections',
        message: `${overdueCollections.length} collections overdue (>30 days). Total: ${formatCurrency(totalOverdue)}`,
        priority: 9,
      })
    }

    // 3. Warning - Upcoming collections (next 7 days)
    const upcomingCollections = entries.filter(e => {
      if (e.entry_type !== 'Credit' || e.category !== 'Sales' || e.settled) return false
      const daysOld = differenceInDays(now, new Date(e.entry_date))
      return daysOld >= 23 && daysOld <= 30 // Due in next 7 days (assuming 30-day terms)
    })
    if (upcomingCollections.length > 0) {
      const totalUpcoming = upcomingCollections.reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0)
      insights.push({
        id: 'upcoming-collections',
        type: 'warning',
        icon: <AlertCircle className="w-5 h-5" />,
        title: 'Upcoming Collections',
        message: `${upcomingCollections.length} collections due soon. Total: ${formatCurrency(totalUpcoming)}`,
        priority: 8,
      })
    }

    // 4. Info - Unsettled credit bills
    const unsettledBills = entries.filter(e =>
      e.entry_type === 'Credit' &&
      ['COGS', 'Opex'].includes(e.category) &&
      !e.settled
    )
    if (unsettledBills.length > 0) {
      const totalBills = unsettledBills.reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0)
      insights.push({
        id: 'unsettled-bills',
        type: 'info',
        icon: <DollarSign className="w-5 h-5" />,
        title: 'Pending Bills',
        message: `${unsettledBills.length} bills to settle. Total: ${formatCurrency(totalBills)}`,
        priority: 6,
      })
    }

    // 5. Success - Positive cash trend
    if (cashBalance > 50000) {
      insights.push({
        id: 'healthy-cash',
        type: 'success',
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'Healthy Cash Position',
        message: `Cash balance is ${formatCurrency(cashBalance)}. Good financial health!`,
        priority: 5,
      })
    }

    // 6. Info - Recent large expenses
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentExpenses = entries.filter(e =>
      ['Cash OUT', 'Credit'].includes(e.entry_type) &&
      ['COGS', 'Opex'].includes(e.category) &&
      new Date(e.entry_date) >= sevenDaysAgo &&
      e.amount > 50000
    )
    if (recentExpenses.length > 0) {
      const totalRecent = recentExpenses.reduce((sum, e) => sum + e.amount, 0)
      insights.push({
        id: 'recent-expenses',
        type: 'info',
        icon: <AlertCircle className="w-5 h-5" />,
        title: 'Recent Large Expenses',
        message: `${recentExpenses.length} large expenses this week. Total: ${formatCurrency(totalRecent)}`,
        priority: 4,
      })
    }

    // 7. Success - Recent settlements
    const recentSettlements = entries.filter(e =>
      e.settled &&
      e.settled_at &&
      new Date(e.settled_at) >= sevenDaysAgo
    )
    if (recentSettlements.length > 0) {
      const totalSettled = recentSettlements.reduce((sum, e) => {
        // Calculate settled amount as original amount minus remaining
        const settledAmount = e.amount - (e.remaining_amount ?? 0)
        return sum + settledAmount
      }, 0)
      insights.push({
        id: 'recent-settlements',
        type: 'success',
        icon: <CheckCircle className="w-5 h-5" />,
        title: 'Recent Settlements',
        message: `${recentSettlements.length} settlements completed this week. Total: ${formatCurrency(totalSettled)}`,
        priority: 3,
      })
    }

    // Sort by priority (highest first) and take top 6
    return insights
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6)
  }, [entries])

  if (insights.length === 0) {
    return (
      <div className="bg-muted/30 border border-border rounded-lg p-6 text-center">
        <p className="text-muted-foreground">
          No insights available yet. Add some entries to see smart business insights!
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {insights.map(insight => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  )
}

interface InsightCardProps {
  insight: Insight
}

function InsightCard({ insight }: InsightCardProps) {
  const bgColor = {
    critical: 'bg-red-900/20 border-red-500/50',
    warning: 'bg-yellow-900/20 border-yellow-500/50',
    info: 'bg-blue-900/20 border-blue-500/50',
    success: 'bg-green-900/20 border-green-500/50',
  }[insight.type]

  const iconColor = {
    critical: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
    success: 'text-green-400',
  }[insight.type]

  return (
    <div className={`${bgColor} border-2 rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <div className={`${iconColor} mt-0.5`}>
          {insight.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-white mb-1">
            {insight.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight.message}
          </p>
        </div>
      </div>
    </div>
  )
}
