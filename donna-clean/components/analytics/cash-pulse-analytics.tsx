'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Banknote, Building2, Clock, Download, RefreshCw, Trash2, DollarSign, Receipt } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { type Entry } from '@/app/entries/actions'
import {
  calculateCashBalance,
  getTotalCashIn,
  getTotalCashOut,
  getMonthlyComparison,
  getEntryCount,
} from '@/lib/analytics-new'
import { showSuccess, showError } from '@/lib/toast'
import { deleteSettlement } from '@/app/settlements/actions'

interface CashPulseAnalyticsProps {
  entries: Entry[]
}

// Standard currency formatter
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Lakhs formatter (1,00,000 style) for large amounts
function formatCurrencyLakhs(amount: number): string {
  const absAmount = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (absAmount >= 10000000) { // 1 Crore or more
    const crores = absAmount / 10000000
    return `${sign}₹${crores.toFixed(2)} Cr`
  } else if (absAmount >= 100000) { // 1 Lakh or more
    const lakhs = absAmount / 100000
    return `${sign}₹${lakhs.toFixed(2)} L`
  } else {
    return formatCurrency(amount)
  }
}

export function CashPulseAnalytics({ entries }: CashPulseAnalyticsProps) {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<'month' | '3months' | 'year'>('month')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deletingSettlement, setDeletingSettlement] = useState<string | null>(null)

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

  // Calculate Pending Bills (unsettled Advance entries where category is COGS/Opex/Assets)
  const pendingBills = useMemo(() => {
    const unsettledAdvances = entries.filter(
      e => e.entry_type === 'Advance' &&
      !e.settled &&
      ['COGS', 'Opex', 'Assets'].includes(e.category)
    )
    const count = unsettledAdvances.length
    const amount = unsettledAdvances.reduce((sum, e) => sum + (e.remaining_amount || e.amount), 0)
    return { count, amount }
  }, [entries])

  // Calculate Advance metrics (all Advance type entries)
  const advanceMetrics = useMemo(() => {
    const advanceEntries = entries.filter(e => e.entry_type === 'Advance')
    const totalAdvances = advanceEntries.length

    // Advances given (Sales category)
    const advancesGiven = advanceEntries.filter(e => e.category === 'Sales')
    const givenCount = advancesGiven.length
    const givenAmount = advancesGiven.reduce((sum, e) => sum + e.amount, 0)
    const givenUnsettled = advancesGiven.filter(e => !e.settled).reduce((sum, e) => sum + (e.remaining_amount || e.amount), 0)

    // Advances taken (COGS/Opex/Assets categories)
    const advancesTaken = advanceEntries.filter(e => ['COGS', 'Opex', 'Assets'].includes(e.category))
    const takenCount = advancesTaken.length
    const takenAmount = advancesTaken.reduce((sum, e) => sum + e.amount, 0)
    const takenUnsettled = advancesTaken.filter(e => !e.settled).reduce((sum, e) => sum + (e.remaining_amount || e.amount), 0)

    return {
      total: totalAdvances,
      given: { count: givenCount, amount: givenAmount, unsettled: givenUnsettled },
      taken: { count: takenCount, amount: takenAmount, unsettled: takenUnsettled }
    }
  }, [entries])

  // Get Settlement History (settled Credit and Advance entries)
  const settlementHistory = useMemo(() => {
    return entries
      .filter(e => (e.entry_type === 'Credit' || e.entry_type === 'Advance') && e.settled && e.settled_at)
      .sort((a, b) => new Date(b.settled_at!).getTime() - new Date(a.settled_at!).getTime())
      .slice(0, 10) // Show last 10 settlements
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

  // Delete settlement
  const handleDeleteSettlement = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this settlement? This will mark the entry as unsettled.')) {
      return
    }

    setDeletingSettlement(entryId)
    try {
      const result = await deleteSettlement(entryId)

      if (result.success) {
        showSuccess('Settlement deleted successfully!')
        router.refresh()
      } else {
        showError(result.error || 'Failed to delete settlement')
      }
    } catch (error) {
      showError('Failed to delete settlement')
      console.error('Error deleting settlement:', error)
    } finally {
      setDeletingSettlement(null)
    }
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

      {/* SECTION 1: Cash Balance - Large prominent card */}
      <div className="bg-gradient-to-br from-purple-900/60 to-purple-800/60 border-2 border-purple-500/40 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Wallet className="w-8 h-8 text-purple-300" />
          </div>
          <div>
            <span className="text-sm text-purple-300 uppercase tracking-wider">Total Cash Balance</span>
            <p className="text-xs text-purple-400 mt-1">As of {format(new Date(), 'dd MMM yyyy')}</p>
          </div>
        </div>
        <div className="text-5xl md:text-6xl font-bold text-white mb-4">
          {formatCurrencyLakhs(cashBalance)}
        </div>
        <div className={`flex items-center gap-2 text-lg ${cashBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {cashBalance >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          <span className="font-semibold">{cashBalance >= 0 ? 'Positive Cash Flow' : 'Negative Cash Flow'}</span>
        </div>
      </div>

      {/* SECTION 2: Cash IN and Cash OUT - Side by side cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cash IN */}
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-2 border-green-500/50 rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <ArrowUpRight className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-base text-green-300 uppercase tracking-wider font-semibold">Cash IN</span>
          </div>
          <div className="text-4xl font-bold text-white mb-3">{formatCurrencyLakhs(totalCashIn)}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-200">{cashInCount} entries</span>
            {monthlyComparison.percentChange.cashIn !== 0 && (
              <span className={`text-sm flex items-center gap-1 font-semibold ${monthlyComparison.percentChange.cashIn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {monthlyComparison.percentChange.cashIn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(monthlyComparison.percentChange.cashIn).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Cash OUT */}
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border-2 border-red-500/50 rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <ArrowDownRight className="w-6 h-6 text-red-400" />
            </div>
            <span className="text-base text-red-300 uppercase tracking-wider font-semibold">Cash OUT</span>
          </div>
          <div className="text-4xl font-bold text-white mb-3">{formatCurrencyLakhs(totalCashOut)}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-200">{cashOutCount} entries</span>
            {monthlyComparison.percentChange.cashOut !== 0 && (
              <span className={`text-sm flex items-center gap-1 font-semibold ${monthlyComparison.percentChange.cashOut >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                {monthlyComparison.percentChange.cashOut >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(monthlyComparison.percentChange.cashOut).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Cash vs Bank Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cash */}
        <div className="bg-purple-900/20 border-2 border-purple-500/30 rounded-lg p-6 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Banknote className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-base text-purple-300 uppercase tracking-wider font-semibold">Cash</span>
          </div>
          <div className="text-3xl font-bold text-white">{formatCurrencyLakhs(cashAmount)}</div>
          <p className="text-xs text-purple-400 mt-2">Physical cash on hand</p>
        </div>

        {/* Bank */}
        <div className="bg-purple-900/20 border-2 border-purple-500/30 rounded-lg p-6 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Building2 className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-base text-purple-300 uppercase tracking-wider font-semibold">Bank</span>
          </div>
          <div className="text-3xl font-bold text-white">{formatCurrencyLakhs(bankAmount)}</div>
          <p className="text-xs text-purple-400 mt-2">Bank account balance</p>
        </div>
      </div>

      {/* SECTION 4: Pending Collections */}
      <div className="bg-yellow-900/10 border-2 border-yellow-500/30 rounded-lg p-6 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Clock className="w-6 h-6 text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Pending Collections</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-900/20 rounded-lg p-4">
            <p className="text-sm text-purple-300 mb-2">No of Pending</p>
            <p className="text-3xl font-bold text-white">{pendingCollections.count}</p>
          </div>
          <div className="bg-purple-900/20 rounded-lg p-4">
            <p className="text-sm text-purple-300 mb-2">Amount to Collect</p>
            <p className="text-3xl font-bold text-yellow-400">{formatCurrencyLakhs(pendingCollections.amount)}</p>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => router.push('/daily-entries')}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors w-full font-semibold shadow-md"
            >
              Settle Collections
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 5: Pending Bills */}
      <div className="bg-orange-900/10 border-2 border-orange-500/30 rounded-lg p-6 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Receipt className="w-6 h-6 text-orange-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Pending Bills</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-900/20 rounded-lg p-4">
            <p className="text-sm text-purple-300 mb-2">No of Pending</p>
            <p className="text-3xl font-bold text-white">{pendingBills.count}</p>
          </div>
          <div className="bg-purple-900/20 rounded-lg p-4">
            <p className="text-sm text-purple-300 mb-2">Amount to Pay</p>
            <p className="text-3xl font-bold text-orange-400">{formatCurrencyLakhs(pendingBills.amount)}</p>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => router.push('/daily-entries')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors w-full font-semibold shadow-md"
            >
              Settle Bills
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 6: Advance */}
      <div className="bg-blue-900/10 border-2 border-blue-500/30 rounded-lg p-6 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <DollarSign className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Advance</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Advance Given (Sales) */}
          <div className="bg-purple-900/20 rounded-lg p-4 border border-green-500/20">
            <p className="text-sm text-green-300 mb-3 font-semibold">Advance Given (Sales)</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-300">Total Count:</span>
                <span className="text-lg font-bold text-white">{advanceMetrics.given.count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-300">Total Amount:</span>
                <span className="text-lg font-bold text-white">{formatCurrency(advanceMetrics.given.amount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
                <span className="text-xs text-yellow-300">Unsettled:</span>
                <span className="text-xl font-bold text-yellow-400">{formatCurrency(advanceMetrics.given.unsettled)}</span>
              </div>
            </div>
          </div>

          {/* Advance Taken (COGS/Opex/Assets) */}
          <div className="bg-purple-900/20 rounded-lg p-4 border border-red-500/20">
            <p className="text-sm text-red-300 mb-3 font-semibold">Advance Taken (Expenses)</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-300">Total Count:</span>
                <span className="text-lg font-bold text-white">{advanceMetrics.taken.count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-300">Total Amount:</span>
                <span className="text-lg font-bold text-white">{formatCurrency(advanceMetrics.taken.amount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
                <span className="text-xs text-orange-300">Unsettled:</span>
                <span className="text-xl font-bold text-orange-400">{formatCurrency(advanceMetrics.taken.unsettled)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-900/20 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Total Advance Entries:</span>
            <span className="text-2xl font-bold text-blue-400">{advanceMetrics.total}</span>
          </div>
        </div>
      </div>

      {/* SECTION 7: Settlement History */}
      <div className="bg-purple-900/10 border-2 border-purple-500/30 rounded-lg p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Settlement History</h2>
          </div>
          <span className="text-sm text-purple-400">Last 10 settlements</span>
        </div>

        {settlementHistory.length === 0 ? (
          <div className="text-center py-8 text-purple-400">
            No settlements found
          </div>
        ) : (
          <div className="space-y-3">
            {settlementHistory.map((entry) => (
              <div
                key={entry.id}
                className="bg-purple-900/20 rounded-lg p-4 flex items-center justify-between hover:bg-purple-900/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      entry.entry_type === 'Credit'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {entry.entry_type}
                    </span>
                    <span className="text-white font-semibold">{formatCurrency(entry.amount)}</span>
                    <span className="text-purple-400 text-sm">{entry.category}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-purple-400">
                    <span>Entry: {format(new Date(entry.entry_date), 'dd MMM yyyy')}</span>
                    <span>Settled: {entry.settled_at ? format(new Date(entry.settled_at), 'dd MMM yyyy') : 'N/A'}</span>
                    {entry.notes && <span className="truncate max-w-xs">{entry.notes}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSettlement(entry.id)}
                  disabled={deletingSettlement === entry.id}
                  className="ml-4 p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Delete settlement"
                >
                  <Trash2 className={`w-5 h-5 ${deletingSettlement === entry.id ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
