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
  getProfitMetrics,
  getExpenseBreakdown,
} from '@/lib/profit-calculations-new'
import { showSuccess } from '@/lib/toast'

interface ProfitLensAnalyticsProps {
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

export function ProfitLensAnalytics({ entries }: ProfitLensAnalyticsProps) {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all-time' | 'customize'>('this-month')
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Custom date range states
  const [showCustomDatePickers, setShowCustomDatePickers] = useState(false)
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>()
  const [customToDate, setCustomToDate] = useState<Date | undefined>()

  // Refresh data on mount to ensure latest entries are shown
  useEffect(() => {
    router.refresh()
  }, [router])

  // Calculate date ranges
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()

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
          startDate: undefined,
          endDate: undefined
        }
      default:
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        }
    }
  }, [dateRange, customFromDate, customToDate])

  // Calculate metrics
  const currentMetrics = useMemo(() => {
    const metrics = getProfitMetrics(entries, startDate, endDate)
    return metrics
  }, [entries, startDate, endDate, dateRange])

  const lastMonthMetrics = useMemo(() => {
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1))
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1))
    return getProfitMetrics(entries, lastMonthStart, lastMonthEnd)
  }, [entries])

  const expenseBreakdown = useMemo(() => getExpenseBreakdown(entries, startDate, endDate), [entries, startDate, endDate])

  // Get top 5 expenses
  const topExpenses = useMemo(() => {
    // Filter for expense entries only (COGS, Opex, Assets)
    let expenseEntries = entries.filter(e =>
      ['COGS', 'Opex', 'Assets'].includes(e.category)
    )

    // Filter by date range if specified
    if (startDate && endDate) {
      expenseEntries = expenseEntries.filter(e => {
        const entryDate = new Date(e.entry_date)
        return entryDate >= startDate && entryDate <= endDate
      })
    }

    // Filter out Credit Settlement (Collections) - we only want actual expenses
    expenseEntries = expenseEntries.filter(e =>
      e.entry_type !== 'Credit Settlement (Collections)' &&
      e.entry_type !== 'Advance Settlement (Received)'
    )

    // Sort by amount descending and take top 5
    return expenseEntries
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [entries, startDate, endDate])

  // Calculate trends
  const marginChange = currentMetrics.profitMargin - lastMonthMetrics.profitMargin

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    // Wait a bit for the refresh to complete
    setTimeout(() => {
      setIsRefreshing(false)
      showSuccess('Data refreshed!')
    }, 500)
  }

  // Export to CSV
  const handleExportCSV = () => {
    const csvContent = [
      ['Metric', 'Amount'].join(','),
      ['Revenue', currentMetrics.revenue].join(','),
      ['COGS', currentMetrics.cogs].join(','),
      ['Gross Profit', currentMetrics.grossProfit].join(','),
      ['Operating Expenses', currentMetrics.operatingExpenses].join(','),
      ['Net Profit', currentMetrics.netProfit].join(','),
      ['Profit Margin %', currentMetrics.profitMargin].join(','),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profit-lens-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    showSuccess('Exported to CSV successfully!')
  }

  // Calculate percentages for breakdown
  const totalExpenses = currentMetrics.cogs + currentMetrics.operatingExpenses
  const cogsPercentage = totalExpenses > 0 ? (currentMetrics.cogs / totalExpenses) * 100 : 0
  const opexPercentage = totalExpenses > 0 ? (currentMetrics.operatingExpenses / totalExpenses) * 100 : 0

  return (
    <div>
      {/* Header Section - Dark Purple */}
      <div className="bg-[#5b21b6] px-4 pt-6 pb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Check what you Earned!</h1>
            <p className="text-sm text-white/70">Period:</p>
          </div>
        </div>

        <select
          value={dateRange}
          onChange={(e) => {
            const value = e.target.value as 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all-time' | 'customize';
            setDateRange(value);
            setShowCustomDatePickers(value === 'customize');
          }}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="this-year">This Year</option>
          <option value="last-year">Last Year</option>
          <option value="all-time">All Time</option>
          <option value="customize">Customize</option>
        </select>

        {/* Show calendar pickers when Customize is selected */}
        {showCustomDatePickers && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500">
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

            <span className="text-sm text-white/70">to</span>

            <Popover>
              <PopoverTrigger asChild>
                <button className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500">
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

      {/* Content Area */}
      <div className="px-4 py-4 pb-24 space-y-3">

      {/* Sales - HERO CARD (Purple gradient) */}
      <div className="bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] border-2 border-purple-500 p-8 md:p-10 rounded-2xl shadow-lg shadow-purple-500/30 relative overflow-hidden mb-4">
        <div className="absolute top-[-50%] right-[-20%] w-64 h-64 bg-purple-500/15 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <DonnaIcon icon={DonnaIcons.profitLens} size="lg" className="text-white" iconClassName="text-white" />
            </div>
            <div className="text-xs uppercase tracking-widest text-white/60 font-bold">
              Sales
            </div>
          </div>

          <div className="text-5xl md:text-6xl lg:text-7xl font-black mb-3 text-white">
            {formatCurrency(currentMetrics.revenue)}
          </div>

          <div className="text-sm text-white/50 font-medium flex items-center gap-2">
            Margin:
            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">
              {currentMetrics.profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Total Expenses + Profit - Side by side */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
        {/* Total Expenses */}
        <div className="bg-white border-2 border-white/10 border-l-4 border-l-red-500 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <DonnaIcon icon={DonnaIcons.totalExpenses} size="sm" className="text-red-600" iconClassName="text-red-600" />
            </div>
            <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Total Expenses
            </span>
          </div>

          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(currentMetrics.cogs + currentMetrics.operatingExpenses)}
          </div>
        </div>

        {/* Profit */}
        <div className="bg-white border-2 border-white/10 border-l-4 border-l-green-500 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <DonnaIcon icon={DonnaIcons.profit} size="sm" className="text-green-600" iconClassName="text-green-600" />
            </div>
            <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Profit
            </span>
          </div>

          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(currentMetrics.netProfit)}
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="mt-4">
        <h3 className="text-sm font-bold text-white/90 uppercase tracking-wide mb-3 px-1">
          Expense Breakdown
        </h3>

        <div className="bg-white border-2 border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
          {/* COGS */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-base font-semibold text-gray-900">COGS</span>
              <span className="text-base font-bold text-gray-900">
                {formatCurrency(currentMetrics.cogs)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${cogsPercentage}%` }}></div>
              </div>
              <span className="text-xs text-gray-500 font-semibold min-w-[45px] text-right">
                {cogsPercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Opex */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-base font-semibold text-gray-900">Opex</span>
              <span className="text-base font-bold text-gray-900">
                {formatCurrency(currentMetrics.operatingExpenses)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${opexPercentage}%` }}></div>
              </div>
              <span className="text-xs text-gray-500 font-semibold min-w-[45px] text-right">
                {opexPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Expenses */}
      <div className="mt-4">
        <h3 className="text-sm font-bold text-white/90 uppercase tracking-wide mb-3 px-1">
          Top 5 Expenses
        </h3>

        <div className="bg-white border-2 border-white/10 rounded-2xl overflow-hidden shadow-lg">
          {topExpenses.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Vendor
                  </th>
                </tr>
              </thead>
              <tbody>
                {topExpenses.map((expense, index) => (
                  <tr key={expense.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {format(new Date(expense.entry_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{expense.category}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[120px]">
                      {expense.party?.name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">No expense data available</p>
          )}
        </div>
      </div>

      </div>
      {/* End Content Area */}
    </div>
  )
}
