'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Banknote, Building2, Clock, Download, RefreshCw } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { type Entry } from '@/app/entries/actions'
import {
  calculateCashBalance,
  getTotalCashIn,
  getTotalCashOut,
  getMonthlyComparison,
  getEntryCount,
} from '@/lib/analytics-new'
import { showSuccess } from '@/lib/toast'

interface CashPulseAnalyticsProps {
  entries: Entry[]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CashPulseAnalytics({ entries }: CashPulseAnalyticsProps) {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<'month' | '3months' | 'year'>('month')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Refresh data on mount to ensure latest entries are shown
  useEffect(() => {
    router.refresh()
  }, [router])

  // Calculate date ranges
  const { startDate, endDate } = useMemo(() => {
    const end = endOfMonth(new Date())
    let start = startOfMonth(new Date())

    if (dateRange === '3months') {
      start = startOfMonth(subMonths(new Date(), 2))
    } else if (dateRange === 'year') {
      start = startOfMonth(subMonths(new Date(), 11))
    }

    return { startDate: start, endDate: end }
  }, [dateRange])

  // Calculate metrics
  const cashBalance = useMemo(() => calculateCashBalance(entries), [entries])
  const totalCashIn = useMemo(() => getTotalCashIn(entries, startDate, endDate), [entries, startDate, endDate])
  const totalCashOut = useMemo(() => getTotalCashOut(entries, startDate, endDate), [entries, startDate, endDate])
  const monthlyComparison = useMemo(() => getMonthlyComparison(entries), [entries])
  const cashInCount = useMemo(() => getEntryCount(entries, 'in', startDate, endDate), [entries, startDate, endDate])
  const cashOutCount = useMemo(() => getEntryCount(entries, 'out', startDate, endDate), [entries, startDate, endDate])

  // Calculate Cash vs Bank breakdown
  const { cashAmount, bankAmount } = useMemo(() => {
    const cash = entries
      .filter(e => e.payment_method === 'Cash')
      .reduce((sum, e) => {
        if (e.entry_type === 'Cash IN' || (e.entry_type === 'Advance' && e.category === 'Sales')) {
          return sum + e.amount
        } else if (e.entry_type === 'Cash OUT' || (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category))) {
          return sum - e.amount
        }
        return sum
      }, 0)

    const bank = entries
      .filter(e => e.payment_method === 'Bank')
      .reduce((sum, e) => {
        if (e.entry_type === 'Cash IN' || (e.entry_type === 'Advance' && e.category === 'Sales')) {
          return sum + e.amount
        } else if (e.entry_type === 'Cash OUT' || (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category))) {
          return sum - e.amount
        }
        return sum
      }, 0)

    return { cashAmount: cash, bankAmount: bank }
  }, [entries])

  // Calculate Pending Collections (unsettled Credit entries)
  const pendingCollections = useMemo(() => {
    const unsettledCredits = entries.filter(e => e.entry_type === 'Credit' && !e.settled)
    const count = unsettledCredits.length
    const amount = unsettledCredits.reduce((sum, e) => sum + (e.remaining_amount || e.amount), 0)
    return { count, amount }
  }, [entries])

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => {
      setIsRefreshing(false)
      showSuccess('Data refreshed!')
    }, 500)
  }

  // Export to CSV
  const handleExportCSV = () => {
    const csvContent = [
      ['Date', 'Entry Type', 'Category', 'Amount', 'Payment Method', 'Notes'].join(','),
      ...entries.map(entry =>
        [
          entry.entry_date,
          entry.entry_type,
          entry.category,
          entry.amount,
          entry.payment_method || '',
          `"${(entry.notes || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cashpulse-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    showSuccess('Exported to CSV successfully!')
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cash Pulse</h1>
          <p className="text-purple-300 mt-1">Cash flow tracking and analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-purple-900/50 hover:bg-purple-900/70 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <label className="text-purple-300 text-sm">Period:</label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as 'month' | '3months' | 'year')}
          className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="month">This Month</option>
          <option value="3months">Last 3 Months</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash Balance */}
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-purple-300 uppercase tracking-wider">Cash Balance</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">{formatCurrency(cashBalance)}</div>
          <div className={`flex items-center gap-1 text-sm ${cashBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {cashBalance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{cashBalance >= 0 ? 'Positive' : 'Negative'}</span>
          </div>
        </div>

        {/* Cash IN */}
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-2 border-green-500 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-green-400" />
            <span className="text-sm text-green-300 uppercase tracking-wider">Cash IN</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">{formatCurrency(totalCashIn)}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-200">{cashInCount} entries</span>
            {monthlyComparison.percentChange.cashIn !== 0 && (
              <span className={`text-sm flex items-center gap-1 ${monthlyComparison.percentChange.cashIn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {monthlyComparison.percentChange.cashIn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(monthlyComparison.percentChange.cashIn).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Cash OUT */}
        <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-2 border-red-500 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-300 uppercase tracking-wider">Cash OUT</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">{formatCurrency(totalCashOut)}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-200">{cashOutCount} entries</span>
            {monthlyComparison.percentChange.cashOut !== 0 && (
              <span className={`text-sm flex items-center gap-1 ${monthlyComparison.percentChange.cashOut >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                {monthlyComparison.percentChange.cashOut >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(monthlyComparison.percentChange.cashOut).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cash vs Bank Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cash */}
        <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-purple-300 uppercase tracking-wider">Cash</span>
          </div>
          <div className="text-3xl font-bold text-white">{formatCurrency(cashAmount)}</div>
        </div>

        {/* Bank */}
        <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-purple-300 uppercase tracking-wider">Bank</span>
          </div>
          <div className="text-3xl font-bold text-white">{formatCurrency(bankAmount)}</div>
        </div>
      </div>

      {/* Pending Collections */}
      <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-yellow-400" />
          <h2 className="text-xl font-semibold text-white">Pending Collections</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-purple-300 mb-1">No of Pending</p>
            <p className="text-2xl font-bold text-white">{pendingCollections.count}</p>
          </div>
          <div>
            <p className="text-sm text-purple-300 mb-1">Amount to Collect</p>
            <p className="text-2xl font-bold text-yellow-400">{formatCurrency(pendingCollections.amount)}</p>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => router.push('/daily-entries')}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors w-full md:w-auto"
            >
              Settle Collections
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
