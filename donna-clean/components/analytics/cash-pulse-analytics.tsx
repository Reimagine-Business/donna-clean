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
import { deleteSettlementHistory, type SettlementHistoryRecord } from '@/app/settlements/settlement-history-actions'
import { SettlementModal } from '@/components/settlement/settlement-modal'

interface CashPulseAnalyticsProps {
  entries: Entry[]
  settlementHistory: SettlementHistoryRecord[]
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

export function CashPulseAnalytics({ entries, settlementHistory }: CashPulseAnalyticsProps) {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all-time'>('this-month')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [settlementModalType, setSettlementModalType] = useState<SettlementModalType>(null)
  const [visibleSettlements, setVisibleSettlements] = useState(10)

  useEffect(() => {
    router.refresh()
  }, [router])

  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    switch (dateRange) {
      case 'this-month':
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        }
      case 'last-month':
        return {
          startDate: startOfMonth(subMonths(now, 1)),
          endDate: endOfMonth(subMonths(now, 1))
        }
      case 'this-year':
        return {
          startDate: new Date(currentYear, 0, 1),
          endDate: now
        }
      case 'last-year':
        return {
          startDate: new Date(currentYear - 1, 0, 1),
          endDate: new Date(currentYear - 1, 11, 31)
        }
      case 'all-time':
        return {
          startDate: new Date(2000, 0, 1),
          endDate: now
        }
      default:
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        }
    }
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

  // Settlement History is now passed as a prop from the settlement_history table
  // No need to filter from entries anymore - includes both Credit and Advance settlements

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
    console.log('🔴 [DELETE] Button clicked!')
    console.log('🔴 [DELETE] Settlement ID:', settlementId)

    if (!confirm('Are you sure you want to delete this settlement? The original entry will be marked as unsettled.')) {
      console.log('❌ [DELETE] User cancelled confirmation')
      return
    }

    console.log('✅ [DELETE] User confirmed, proceeding...')
    setDeletingId(settlementId)

    try {
      console.log('⏳ [DELETE] Calling deleteSettlementHistory action...')
      const result = await deleteSettlementHistory(settlementId)

      console.log('📊 [DELETE] Result received:', result)

      if (!result.success) {
        console.error('❌ [DELETE] Action returned failure:', result.error)
        showError(result.error || 'Failed to delete settlement')
        return
      }

      console.log('✅ [DELETE] Action succeeded, showing success message')
      showSuccess('Settlement deleted successfully!')

      console.log('🔄 [DELETE] Refreshing router...')
      router.refresh()

      console.log('✅ [DELETE] Complete!')
    } catch (error) {
      console.error('❌ [DELETE] Exception caught:', error)
      showError('Failed to delete settlement')
    } finally {
      console.log('🧹 [DELETE] Cleaning up, setting deletingId to null')
      setDeletingId(null)
    }
  }

  const handleExportSettlements = () => {
    console.log('📥 [EXPORT] Exporting settlement history...')

    // Prepare CSV data from settlement_history table
    const csvData = settlementHistory.map(item => {
      return {
        Date: format(new Date(item.settlement_date), 'dd MMM yyyy'),
        Type: `${item.entry_type} ${item.category}`,  // e.g., "Credit Sales" or "Advance Sales"
        'Settlement Type': item.settlement_type,  // 'credit' or 'advance'
        Category: item.category,
        Amount: item.amount,
        'Settled On': format(new Date(item.created_at), 'dd MMM yyyy'),
        'Original Entry ID': item.original_entry_id,
        'Settlement Entry ID': item.settlement_entry_id || 'N/A',  // NULL for Advance
        Notes: item.notes || ''
      }
    })

    // Convert to CSV
    const headers = Object.keys(csvData[0]).join(',')
    const rows = csvData.map(row =>
      Object.values(row).map(val =>
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    ).join('\n')
    const csv = `${headers}\n${rows}`

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `settlement-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showSuccess('Settlement history exported successfully!')
    console.log('✅ [EXPORT] Export complete')
  }

  return (
    <div className="space-y-3">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* COMPACT MAIN VIEW (Visible in one viewport) */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Check what you Have!</h1>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all-time')}
            className="px-3 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
            <option value="last-year">Last Year</option>
            <option value="all-time">All Time</option>
          </select>
        </div>
      </div>

      {/* Total Cash Balance */}
      <div className="bg-gradient-to-br from-purple-900/60 to-purple-800/60 border-2 border-purple-500/40 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 text-purple-300" />
          <span className="text-xs text-purple-300 uppercase tracking-wider font-medium">Total Cash Balance</span>
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {formatCurrency(cashBalance)}
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
          <div className="text-xl font-bold text-white mb-1">{formatCurrency(totalCashIn)}</div>
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
          <div className="text-xl font-bold text-white mb-1">{formatCurrency(totalCashOut)}</div>
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

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Showing {Math.min(visibleSettlements, settlementHistory.length)} of {settlementHistory.length}</span>
              <button
                onClick={handleExportSettlements}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-md text-xs font-medium flex items-center gap-1 hover:bg-purple-600 transition-colors"
                type="button"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>

          {settlementHistory.length > 0 ? (
            <div className="space-y-2">
              {settlementHistory.slice(0, visibleSettlements).map((settlement, index) => {
                // ✅ NEW: Using settlement_history table structure
                // No more parsing from notes - we have typed data!

                return (
                  <div key={settlement.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md relative">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {/* ✅ NEW: Badge shows Credit (green) vs Advance (purple) */}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          settlement.settlement_type === 'credit'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-purple-500/20 text-purple-500'
                        }`}>
                          {settlement.entry_type} {settlement.category}
                        </span>
                        <span className="text-sm font-medium text-white">{formatCurrency(settlement.amount)}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Settled: {format(new Date(settlement.settlement_date), 'dd MMM yyyy')}</span>
                        {settlement.settlement_type === 'advance' && (
                          <span className="text-purple-400">⚡ Advance</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log(`🗑️ [DELETE] Settlement #${index}:`, settlement.id)
                        handleDeleteSettlement(settlement.id)
                      }}
                      disabled={deletingId === settlement.id}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50 relative z-10 cursor-pointer"
                      style={{ pointerEvents: 'auto' }}
                      type="button"
                      aria-label="Delete settlement"
                      title="Delete settlement"
                    >
                      <Trash2 className="w-4 h-4 pointer-events-none" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No settlement history</p>
          )}

          {settlementHistory.length > visibleSettlements && (
            <button
              onClick={() => {
                console.log('📊 [LOAD_MORE] Clicked - showing more settlements')
                console.log('📊 Current visible:', visibleSettlements)
                console.log('📊 Total available:', settlementHistory.length)
                setVisibleSettlements(prev => prev + 10)
              }}
              className="w-full mt-3 px-4 py-2 border border-border rounded-md text-sm font-medium text-white hover:bg-muted/50 transition-colors"
              type="button"
            >
              Load More ({settlementHistory.length - visibleSettlements} more)
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
