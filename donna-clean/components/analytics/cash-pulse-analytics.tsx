'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Download, RefreshCw, Trash2 } from 'lucide-react'
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
import { SettlementModal } from '@/components/settlement/settlement-modal'

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

function formatCurrencyLakhs(amount: number): string {
  const absAmount = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (absAmount >= 10000000) {
    const crores = absAmount / 10000000
    return `${sign}₹${crores.toFixed(2)} Cr`
  } else if (absAmount >= 100000) {
    const lakhs = absAmount / 100000
    return `${sign}₹${lakhs.toFixed(2)} L`
  } else {
    return formatCurrency(amount)
  }
}

type SettlementModalType = 'credit-sales' | 'credit-bills' | 'advance-sales' | 'advance-expenses' | null;

export function CashPulseAnalytics({ entries }: CashPulseAnalyticsProps) {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<'month' | '3months' | 'year'>('month')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [settlementModalType, setSettlementModalType] = useState<SettlementModalType>(null)

  useEffect(() => {
    router.refresh()
  }, [router])

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

  // Calculate percentages for breakdown
  const totalPayment = cashAmount + bankAmount
  const cashPercentage = totalPayment > 0 ? (cashAmount / totalPayment) * 100 : 0
  const bankPercentage = totalPayment > 0 ? (bankAmount / totalPayment) * 100 : 0

  // Calculate Pending Collections (Credit Sales to collect)
  const pendingCollections = useMemo(() => {
    const pending = entries.filter(e =>
      e.entry_type === 'Credit' &&
      e.category === 'Sales' &&
      !e.settled
    )
    return {
      items: pending,
      count: pending.length,
      amount: pending.reduce((sum, e) => sum + e.amount, 0)
    }
  }, [entries])

  // Calculate Pending Bills (Credit expenses to pay)
  const pendingBills = useMemo(() => {
    const pending = entries.filter(e =>
      e.entry_type === 'Credit' &&
      ['COGS', 'Opex', 'Assets'].includes(e.category) &&
      !e.settled
    )
    return {
      items: pending,
      count: pending.length,
      amount: pending.reduce((sum, e) => sum + e.amount, 0)
    }
  }, [entries])

  // Calculate Advance (Received and Paid)
  const advance = useMemo(() => {
    const received = entries.filter(e =>
      e.entry_type === 'Advance' &&
      e.category === 'Sales' &&
      !e.settled
    )
    const paid = entries.filter(e =>
      e.entry_type === 'Advance' &&
      ['COGS', 'Opex', 'Assets'].includes(e.category) &&
      !e.settled
    )
    return {
      received: {
        items: received,
        count: received.length,
        amount: received.reduce((sum, e) => sum + e.amount, 0)
      },
      paid: {
        items: paid,
        count: paid.length,
        amount: paid.reduce((sum, e) => sum + e.amount, 0)
      }
    }
  }, [entries])

  // Get Settlement History (last 10 settlements)
  const settlementHistory = useMemo(() => {
    return entries
      .filter(e => e.notes && e.notes.startsWith('Settlement of'))
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      .slice(0, 10)
  }, [entries])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => {
      setIsRefreshing(false)
      showSuccess('Data refreshed!')
    }, 500)
  }

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

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!confirm('Are you sure you want to delete this settlement? The original entry will be marked as unsettled.')) {
      return
    }

    setDeletingId(settlementId)
    try {
      await deleteSettlement(settlementId)
      showSuccess('Settlement deleted successfully!')
      router.refresh()
    } catch (error) {
      console.error('Failed to delete settlement:', error)
      showError('Failed to delete settlement')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* COMPACT MAIN VIEW (Visible in one viewport) */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cash Pulse</h1>
          <p className="text-purple-300 text-xs mt-0.5">Cash flow tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-purple-900/50 hover:bg-purple-900/70 text-white rounded-lg transition-colors disabled:opacity-50"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            aria-label="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <label className="text-purple-300 text-xs">Period:</label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as 'month' | '3months' | 'year')}
          className="px-3 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="month">This Month</option>
          <option value="3months">Last 3 Months</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Total Cash Balance */}
      <div className="bg-gradient-to-br from-purple-900/60 to-purple-800/60 border-2 border-purple-500/40 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 text-purple-300" />
          <span className="text-xs text-purple-300 uppercase tracking-wider font-medium">Total Cash Balance</span>
        </div>
        <div className="text-4xl font-bold text-white mb-1">
          {formatCurrencyLakhs(cashBalance)}
        </div>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1 text-sm ${cashBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {cashBalance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-semibold">{cashBalance >= 0 ? 'Positive' : 'Negative'}</span>
          </div>
          <span className="text-xs text-purple-400">As of {format(new Date(), 'dd MMM yyyy')}</span>
        </div>
      </div>

      {/* Cash IN and Cash OUT - Side by side */}
      <div className="grid grid-cols-2 gap-2">
        {/* Cash IN */}
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-2 border-green-500/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowUpRight className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-300 uppercase tracking-wider font-medium">Cash IN</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{formatCurrencyLakhs(totalCashIn)}</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-200">{cashInCount} entries</span>
            {monthlyComparison.percentChange.cashIn !== 0 && (
              <span className={`text-xs flex items-center gap-0.5 font-semibold ${monthlyComparison.percentChange.cashIn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {monthlyComparison.percentChange.cashIn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(monthlyComparison.percentChange.cashIn).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Cash OUT */}
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border-2 border-red-500/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowDownRight className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-300 uppercase tracking-wider font-medium">Cash OUT</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{formatCurrencyLakhs(totalCashOut)}</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-200">{cashOutCount} entries</span>
            {monthlyComparison.percentChange.cashOut !== 0 && (
              <span className={`text-xs flex items-center gap-0.5 font-semibold ${monthlyComparison.percentChange.cashOut >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                {monthlyComparison.percentChange.cashOut >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(monthlyComparison.percentChange.cashOut).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Balances */}
      <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-white mb-2">Balances</h3>

        {/* Cash */}
        <div className="space-y-1 mb-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-200">Cash</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{formatCurrency(cashAmount)}</span>
              <span className="text-xs text-purple-400">{cashPercentage.toFixed(1)}%</span>
            </div>
          </div>
          <div className="w-full bg-purple-900/30 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${cashPercentage}%` }}></div>
          </div>
        </div>

        {/* Bank */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-200">Bank</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{formatCurrency(bankAmount)}</span>
              <span className="text-xs text-purple-400">{bankPercentage.toFixed(1)}%</span>
            </div>
          </div>
          <div className="w-full bg-purple-900/30 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${bankPercentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SETTLEMENT SECTIONS (Below main view - scroll to see) */}
      {/* ═══════════════════════════════════════════════════════════ */}

      <div className="space-y-3 mt-4">
        {/* PENDING COLLECTIONS */}
        <div className="bg-card rounded-lg p-4 border-l-4 border-orange-500">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💰</span>
                <h3 className="text-sm font-semibold text-white">PENDING COLLECTIONS</h3>
              </div>

              {pendingCollections.count > 0 ? (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">No of Pending:</span>
                    <span className="text-sm font-medium text-white">{pendingCollections.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Amount to Collect:</span>
                    <span className="text-sm font-bold text-orange-500">{formatCurrency(pendingCollections.amount)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending collections</p>
              )}
            </div>
          </div>

          {pendingCollections.count > 0 && (
            <button
              onClick={() => setSettlementModalType('credit-sales')}
              className="w-full mt-3 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              Settle Collections →
            </button>
          )}
        </div>

        {/* PENDING BILLS */}
        <div className="bg-card rounded-lg p-4 border-l-4 border-red-500">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💸</span>
                <h3 className="text-sm font-semibold text-white">PENDING BILLS</h3>
              </div>

              {pendingBills.count > 0 ? (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">No of Pending:</span>
                    <span className="text-sm font-medium text-white">{pendingBills.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Amount to Pay:</span>
                    <span className="text-sm font-bold text-red-500">{formatCurrency(pendingBills.amount)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending bills</p>
              )}
            </div>
          </div>

          {pendingBills.count > 0 && (
            <button
              onClick={() => setSettlementModalType('credit-bills')}
              className="w-full mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              Settle Bills →
            </button>
          )}
        </div>

        {/* ADVANCE */}
        <div className="bg-card rounded-lg p-4 border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⏰</span>
                <h3 className="text-sm font-semibold text-white">ADVANCE</h3>
              </div>

              {(advance.received.count > 0 || advance.paid.count > 0) ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Received (Sales):</span>
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(advance.received.amount)}
                      <span className="text-xs text-muted-foreground ml-1">({advance.received.count} pending)</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Paid (Expenses):</span>
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(advance.paid.amount)}
                      <span className="text-xs text-muted-foreground ml-1">({advance.paid.count} pending)</span>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending advance payments</p>
              )}
            </div>
          </div>

          {advance.received.count > 0 && (
            <button
              onClick={() => setSettlementModalType('advance-sales')}
              className="w-full mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              Settle Advance (Sales) →
            </button>
          )}
          {advance.paid.count > 0 && (
            <button
              onClick={() => setSettlementModalType('advance-expenses')}
              className="w-full mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Settle Advance (Expenses) →
            </button>
          )}
        </div>

        {/* SETTLEMENT HISTORY */}
        <div className="bg-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <h3 className="text-sm font-semibold text-white">SETTLEMENT HISTORY</h3>
            </div>
            <span className="text-xs text-muted-foreground">Last 10 settlements</span>
          </div>

          {settlementHistory.length > 0 ? (
            <div className="space-y-2">
              {settlementHistory.map((settlement) => {
                // Parse the original entry ID from notes
                // Pattern: "Settlement of Credit Sales (ID: xxx)" or "Settlement of credit sales (xxx)"
                const originalEntryMatch = settlement.notes?.match(/\(ID:\s*([^)]+)\)/) ||
                                         settlement.notes?.match(/\(([a-f0-9-]{36})\)/);
                const originalEntryId = originalEntryMatch?.[1];

                // Parse entry type for display
                const entryTypeMatch = settlement.notes?.match(/Settlement of (.*?) \(/);
                const entryType = entryTypeMatch?.[1] || 'Unknown';

                return (
                  <div key={settlement.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          settlement.entry_type === 'Cash IN'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {entryType}
                        </span>
                        <span className="text-sm font-medium text-white">{formatCurrency(settlement.amount)}</span>
                        <span className="text-xs text-muted-foreground">{settlement.category}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Entry: {format(new Date(settlement.entry_date), 'dd MMM yyyy')}</span>
                        {settlement.created_at && (
                          <span>Settled: {format(new Date(settlement.created_at), 'dd MMM yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => originalEntryId && handleDeleteSettlement(originalEntryId)}
                      disabled={deletingId === originalEntryId || !originalEntryId}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
                      aria-label="Delete settlement"
                      title={!originalEntryId ? 'Cannot delete: Original entry ID not found' : 'Delete settlement'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No settlement history</p>
          )}

          {settlementHistory.length >= 10 && (
            <button
              onClick={() => router.push('/settlements')}
              className="w-full mt-3 px-4 py-2 border border-border rounded-md text-sm font-medium text-white hover:bg-muted/50 transition-colors"
            >
              Load More
            </button>
          )}
        </div>
      </div>

      {/* Settlement Modal */}
      {settlementModalType && (
        <SettlementModal
          type={settlementModalType}
          pendingItems={
            settlementModalType === 'credit-sales' ? pendingCollections.items :
            settlementModalType === 'credit-bills' ? pendingBills.items :
            settlementModalType === 'advance-sales' ? advance.received.items :
            settlementModalType === 'advance-expenses' ? advance.paid.items :
            []
          }
          onClose={() => setSettlementModalType(null)}
          onSuccess={() => {
            setSettlementModalType(null);
            router.refresh();
          }}
        />
      )}
    </div>
  )
}
