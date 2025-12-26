'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DonnaIcon } from '@/components/common/donna-icon'
import { DonnaIcons } from '@/lib/icon-mappings'
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
  const [dateRange, setDateRange] = useState<'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all-time' | 'customize'>('this-month')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [settlementModalType, setSettlementModalType] = useState<SettlementModalType>(null)
  // Custom date range states
  const [showCustomDatePickers, setShowCustomDatePickers] = useState(false)
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>()
  const [customToDate, setCustomToDate] = useState<Date | undefined>()
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

    // Handle custom date range
    if (dateRange === 'customize' && customFromDate && customToDate) {
      return {
        startDate: customFromDate,
        endDate: customToDate
      }
    }

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
  }, [dateRange, customFromDate, customToDate])

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
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Check what you Have!</h1>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Period:</span>
            <select
              value={dateRange}
              onChange={(e) => {
                const value = e.target.value as 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all-time' | 'customize';
                setDateRange(value);
                setShowCustomDatePickers(value === 'customize');
              }}
              className="px-3 py-1.5 bg-white border-2 border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="last-year">Last Year</option>
              <option value="all-time">All Time</option>
              <option value="customize">Customize</option>
            </select>
          </div>
        </div>

        {/* Show calendar pickers when Customize is selected */}
        {showCustomDatePickers && (
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {customFromDate ? format(customFromDate, "MMM dd, yyyy") : "From Date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customFromDate}
                  onSelect={setCustomFromDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-sm text-gray-600">to</span>

            <Popover>
              <PopoverTrigger asChild>
                <button className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {customToDate ? format(customToDate, "MMM dd, yyyy") : "To Date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customToDate}
                  onSelect={setCustomToDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Cash IN and Cash OUT - Side by side (MOVED UP) */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {/* Cash IN */}
        <div className="bg-white border-2 border-gray-200 border-l-4 border-l-green-500 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <DonnaIcon icon={DonnaIcons.cashIn} size="sm" variant="success" />
            <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Cash In
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(totalCashIn)}
          </div>
          <div className="text-xs text-gray-400">
            {cashInCount} entries
          </div>
        </div>

        {/* Cash OUT */}
        <div className="bg-white border-2 border-gray-200 border-l-4 border-l-red-500 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <DonnaIcon icon={DonnaIcons.cashOut} size="sm" variant="danger" />
            <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Cash Out
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(totalCashOut)}
          </div>
          <div className="text-xs text-gray-400">
            {cashOutCount} entries
          </div>
        </div>
      </div>

      {/* What's left! - NEW PRIMARY HERO CARD */}
      <div className={`bg-white border-2 border-gray-200 p-6 md:p-8 rounded-2xl shadow-md relative overflow-hidden ${
        periodChange >= 0
          ? 'border-l-4 border-l-green-500'
          : 'border-l-4 border-l-red-500'
      }`}>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <DonnaIcon
              icon={DonnaIcons.whatsLeft}
              size="md"
              variant={periodChange >= 0 ? 'success' : 'danger'}
            />
            <span className="text-sm font-semibold text-gray-900">What's left!</span>
          </div>
          <div className="text-xs text-gray-500 mb-3">
            {getPeriodLabel(dateRange)}
          </div>
          <div className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-br from-purple-600 to-purple-400 bg-clip-text text-transparent mb-2">
            {formatCurrency(periodChange)}
          </div>
          <div className="text-xs text-gray-400">
            Cash In - Cash Out
          </div>
        </div>
      </div>

      {/* Total cash balance - DEMOTED SECONDARY CARD */}
      <div className="bg-white border-2 border-gray-200 p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <DonnaIcon icon={DonnaIcons.totalCashBalance} size="md" />
          <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
            Total cash balance
          </div>
        </div>
        <div className="text-3xl md:text-4xl font-bold mb-2 text-gray-900">
          {formatCurrency(cashBalance)}
        </div>
        <div className="text-xs text-gray-500 mb-1">
          {formatCurrency(previousBalance)} previous + {formatCurrency(periodChange)} {getPeriodLabel(dateRange).toLowerCase()}
        </div>
        <div className="text-xs text-gray-400">
          As of {format(new Date(), 'dd MMM yyyy')}
        </div>
      </div>

      {/* Balances */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-3 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Balances</h3>

        {/* Cash */}
        <div className="space-y-1 mb-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Cash</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{formatCurrency(cashAmount)}</span>
              <span className="text-xs text-gray-500">{cashPercentage.toFixed(1)}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(cashPercentage, 100)}%` }}></div>
          </div>
        </div>

        {/* Bank */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Bank</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{formatCurrency(bankAmount)}</span>
              <span className="text-xs text-gray-500">{bankPercentage.toFixed(1)}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(bankPercentage, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SETTLEMENT SECTIONS (Below main view - scroll to see) */}
      {/* ═══════════════════════════════════════════════════════════ */}

      <div className="space-y-3 mt-4">
        {/* PENDING COLLECTIONS */}
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <div className="flex items-center gap-3 mb-3">
                <DonnaIcon icon={DonnaIcons.pendingCollection} size="sm" variant="warning" />
                <h3 className="text-sm font-semibold text-gray-900">PENDING COLLECTIONS</h3>
              </div>

              {pendingCollections.count > 0 ? (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">No of Pending:</span>
                    <span className="text-sm font-medium text-gray-900">{pendingCollections.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Amount to Collect:</span>
                    <span className="text-sm font-bold text-orange-500">{formatCurrency(pendingCollections.amount)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No pending collections</p>
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
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-4 border-l-4 border-red-500">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <div className="flex items-center gap-3 mb-3">
                <DonnaIcon icon={DonnaIcons.billsDue} size="sm" variant="danger" />
                <h3 className="text-sm font-semibold text-gray-900">PENDING BILLS</h3>
              </div>

              {pendingBills.count > 0 ? (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">No of Pending:</span>
                    <span className="text-sm font-medium text-gray-900">{pendingBills.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Amount to Pay:</span>
                    <span className="text-sm font-bold text-red-500">{formatCurrency(pendingBills.amount)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No pending bills</p>
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
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <div className="flex items-center gap-2 mb-3">
                <DonnaIcon icon={DonnaIcons.clock} size="sm" variant="default" />
                <h3 className="text-sm font-semibold text-gray-900">ADVANCE</h3>
              </div>

              {(advance.received.count > 0 || advance.paid.count > 0) ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Received (Sales):</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(advance.received.amount)}
                      <span className="text-xs text-white ml-1">({advance.received.count} pending)</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Paid (Expenses):</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(advance.paid.amount)}
                      <span className="text-xs text-white ml-1">({advance.paid.count} pending)</span>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No pending advance payments</p>
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
