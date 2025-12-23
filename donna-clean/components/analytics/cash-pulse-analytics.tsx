'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Download, RefreshCw, Trash2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { type Entry } from '@/lib/entries'
import {
  calculateCashBalance,
  getTotalCashIn,
  getTotalCashOut,
  getMonthlyComparison,
  getEntryCount,
} from '@/lib/analytics-new'
import { showSuccess, showError } from '@/lib/toast'
import { type SettlementHistoryRecord } from '@/app/settlements/settlement-history-actions'
import { SettlementModal } from '@/components/settlements/settlement-modal'
import { PendingCollectionsDashboard, type CustomerGroup } from '@/components/settlements/pending-collections-dashboard'
import { CustomerSettlementModal } from '@/components/settlements/customer-settlement-modal'
import { PendingBillsDashboard, type VendorGroup } from '@/components/settlements/pending-bills-dashboard'
import { VendorSettlementModal } from '@/components/settlements/vendor-settlement-modal'
import { PendingAdvancesDashboard, type AdvanceGroup } from '@/components/settlements/pending-advances-dashboard'
import { AdvanceSettlementModal } from '@/components/settlements/advance-settlement-modal'

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

// Helper function to get period label
function getPeriodLabel(dateRange: string): string {
  switch (dateRange) {
    case 'this-month':
      return 'This Month'
    case 'last-month':
      return 'Last Month'
    case 'this-year':
      return 'This Year'
    case 'last-year':
      return 'Last Year'
    case 'all-time':
      return 'All Time'
    default:
      return 'This Month'
  }
}

type SettlementModalType = 'credit-sales' | 'credit-bills' | 'advance-sales' | 'advance-expenses' | null;

export function CashPulseAnalytics({ entries, settlementHistory }: CashPulseAnalyticsProps) {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all-time'>('this-month')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [settlementModalType, setSettlementModalType] = useState<SettlementModalType>(null)
  // New two-stage settlement flow state
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerGroup | null>(null)
  const [billsDashboardOpen, setBillsDashboardOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<VendorGroup | null>(null)
  const [advancesDashboardOpen, setAdvancesDashboardOpen] = useState(false)
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceGroup | null>(null)

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

  // Calculate "What's left!" (period change)
  const periodChange = useMemo(() => totalCashIn - totalCashOut, [totalCashIn, totalCashOut])

  // Calculate previous balance for breakdown
  const previousBalance = useMemo(() => cashBalance - periodChange, [cashBalance, periodChange])

  // Calculate Cash vs Bank breakdown
  const { cashAmount, bankAmount } = useMemo(() => {
    const cash = entries
      .filter(e => e.payment_method === 'Cash')
      .reduce((sum, e) => {
        if (
          e.entry_type === 'Cash IN' ||
          e.entry_type === 'Credit Settlement (Collections)' ||
          (e.entry_type === 'Advance' && e.category === 'Sales')
          // ❌ Excludes: Advance Settlement (Received) - no cash movement
        ) {
          return sum + e.amount
        } else if (
          e.entry_type === 'Cash OUT' ||
          e.entry_type === 'Credit Settlement (Bills)' ||
          (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category))
          // ❌ Excludes: Advance Settlement (Paid) - no cash movement
        ) {
          return sum - e.amount
        }
        return sum
      }, 0)

    const bank = entries
      .filter(e => e.payment_method === 'Bank')
      .reduce((sum, e) => {
        if (
          e.entry_type === 'Cash IN' ||
          e.entry_type === 'Credit Settlement (Collections)' ||
          (e.entry_type === 'Advance' && e.category === 'Sales')
          // ❌ Excludes: Advance Settlement (Received) - no cash movement
        ) {
          return sum + e.amount
        } else if (
          e.entry_type === 'Cash OUT' ||
          e.entry_type === 'Credit Settlement (Bills)' ||
          (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category))
          // ❌ Excludes: Advance Settlement (Paid) - no cash movement
        ) {
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
      amount: pending.reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0)
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
      amount: pending.reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0)
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
        amount: received.reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0)
      },
      paid: {
        items: paid,
        count: paid.length,
        amount: paid.reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0)
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

  return (
    <div className="space-y-3">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* COMPACT MAIN VIEW (Visible in one viewport) */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Check what you Have!</h1>

        <div className="flex items-center gap-2">
          <span className="text-sm text-white">Period:</span>
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

      {/* Cash IN and Cash OUT - Side by side (MOVED UP) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Cash IN */}
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-2 border-green-500/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowUpRight className="w-4 h-4 text-green-400" />
            <span className="text-xs text-white uppercase tracking-wider font-medium">Cash IN</span>
          </div>
          <div className="text-xl font-bold text-white mb-1">{formatCurrency(totalCashIn)}</div>
          <div className="text-xs text-white">{cashInCount} entries</div>
        </div>

        {/* Cash OUT */}
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border-2 border-red-500/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowDownRight className="w-4 h-4 text-red-400" />
            <span className="text-xs text-white uppercase tracking-wider font-medium">Cash OUT</span>
          </div>
          <div className="text-xl font-bold text-white mb-1">{formatCurrency(totalCashOut)}</div>
          <div className="text-xs text-white">{cashOutCount} entries</div>
        </div>
      </div>

      {/* 💰 What's left! - NEW PRIMARY HERO CARD */}
      <div className={`border-2 rounded-lg p-4 ${
        periodChange >= 0
          ? 'bg-gradient-to-br from-green-900/40 to-green-800/30 border-green-500/50'
          : 'bg-gradient-to-br from-red-900/40 to-red-800/30 border-red-500/50'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">💰</span>
          <span className="text-sm font-semibold text-white">What's left!</span>
        </div>
        <div className="text-xs text-white mb-1 opacity-80">
          {getPeriodLabel(dateRange)}
        </div>
        <div className={`text-4xl font-bold mb-2 ${
          periodChange >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {formatCurrency(periodChange)}
        </div>
        <div className="text-xs text-white opacity-70">
          Cash In - Cash Out
        </div>
      </div>

      {/* 💳 Total cash balance - DEMOTED SECONDARY CARD */}
      <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/30 border-2 border-purple-500/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">💳</span>
          <span className="text-sm font-semibold text-white">Total cash balance</span>
        </div>
        <div className="text-3xl font-bold mb-2 text-white">
          {formatCurrency(cashBalance)}
        </div>
        <div className="text-xs text-white opacity-70 mb-1">
          {formatCurrency(previousBalance)} previous + {formatCurrency(periodChange)} {getPeriodLabel(dateRange).toLowerCase()}
        </div>
        <div className="text-xs text-white opacity-60">
          As of {format(new Date(), 'dd MMM yyyy')}
        </div>
      </div>

      {/* Balances */}
      <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-white mb-2">Balances</h3>

        {/* Cash */}
        <div className="space-y-1 mb-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white">Cash</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{formatCurrency(cashAmount)}</span>
              <span className="text-xs text-white">{cashPercentage.toFixed(1)}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
            <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${Math.min(cashPercentage, 100)}%` }}></div>
          </div>
        </div>

        {/* Bank */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white">Bank</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{formatCurrency(bankAmount)}</span>
              <span className="text-xs text-white">{bankPercentage.toFixed(1)}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
            <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${Math.min(bankPercentage, 100)}%` }}></div>
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
                    <span className="text-xs text-white">No of Pending:</span>
                    <span className="text-sm font-medium text-white">{pendingCollections.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-white">Amount to Collect:</span>
                    <span className="text-sm font-bold text-orange-500">{formatCurrency(pendingCollections.amount)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white">No pending collections</p>
              )}
            </div>
          </div>

          {pendingCollections.count > 0 && (
            <button
              onClick={() => {
                setDashboardOpen(true)
                setSettlementModalType('credit-sales')
              }}
              className="w-full mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-sm font-medium transition-colors"
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
                    <span className="text-xs text-white">No of Pending:</span>
                    <span className="text-sm font-medium text-white">{pendingBills.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-white">Amount to Pay:</span>
                    <span className="text-sm font-bold text-red-500">{formatCurrency(pendingBills.amount)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white">No pending bills</p>
              )}
            </div>
          </div>

          {pendingBills.count > 0 && (
            <button
              onClick={() => setBillsDashboardOpen(true)}
              className="w-full mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-sm font-medium transition-colors"
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
                    <span className="text-xs text-white">Received (Sales):</span>
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(advance.received.amount)}
                      <span className="text-xs text-white ml-1">({advance.received.count} pending)</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white">Paid (Expenses):</span>
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(advance.paid.amount)}
                      <span className="text-xs text-white ml-1">({advance.paid.count} pending)</span>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white">No pending advance payments</p>
              )}
            </div>
          </div>

          {(advance.received.count > 0 || advance.paid.count > 0) && (
            <button
              onClick={() => setAdvancesDashboardOpen(true)}
              className="w-full mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              Settle Advances →
            </button>
          )}
        </div>
      </div>

      {/* New Two-Stage Settlement Flow - Collections - Stage 1: Dashboard */}
      {dashboardOpen && settlementModalType === 'credit-sales' && (
        <PendingCollectionsDashboard
          entries={pendingCollections.items}
          open={dashboardOpen}
          onClose={() => {
            setDashboardOpen(false)
            setSettlementModalType(null)
          }}
          onSettleCustomer={(customer) => {
            setSelectedCustomer(customer)
            setDashboardOpen(false)
          }}
        />
      )}

      {/* New Two-Stage Settlement Flow - Collections - Stage 2: Customer Modal */}
      {selectedCustomer && !dashboardOpen && (
        <CustomerSettlementModal
          customer={selectedCustomer}
          onClose={() => {
            setSelectedCustomer(null)
            setSettlementModalType(null)
          }}
          onSuccess={() => {
            setSelectedCustomer(null)
            setSettlementModalType(null)
            router.refresh()
          }}
        />
      )}

      {/* New Two-Stage Settlement Flow - Bills - Stage 1: Dashboard */}
      {billsDashboardOpen && (
        <PendingBillsDashboard
          entries={pendingBills.items}
          open={billsDashboardOpen}
          onClose={() => {
            setBillsDashboardOpen(false)
          }}
          onSettleVendor={(vendor) => {
            setSelectedVendor(vendor)
            setBillsDashboardOpen(false)
          }}
        />
      )}

      {/* New Two-Stage Settlement Flow - Bills - Stage 2: Vendor Modal */}
      {selectedVendor && !billsDashboardOpen && (
        <VendorSettlementModal
          vendor={selectedVendor}
          onClose={() => {
            setSelectedVendor(null)
          }}
          onSuccess={() => {
            setSelectedVendor(null)
            router.refresh()
          }}
        />
      )}

      {/* New Two-Stage Settlement Flow - Advances - Stage 1: Dashboard */}
      {advancesDashboardOpen && (
        <PendingAdvancesDashboard
          entries={[...advance.received.items, ...advance.paid.items]}
          open={advancesDashboardOpen}
          onClose={() => {
            setAdvancesDashboardOpen(false)
          }}
          onSettleAdvance={(advanceItem) => {
            setSelectedAdvance(advanceItem)
            setAdvancesDashboardOpen(false)
          }}
        />
      )}

      {/* New Two-Stage Settlement Flow - Advances - Stage 2: Advance Modal */}
      {selectedAdvance && !advancesDashboardOpen && (
        <AdvanceSettlementModal
          advance={selectedAdvance}
          onClose={() => {
            setSelectedAdvance(null)
          }}
          onSuccess={() => {
            setSelectedAdvance(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
