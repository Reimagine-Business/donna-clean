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
    <div className="space-y-3">
      {/* Header with Actions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Check what you Earned!</h1>

          {/* Period Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-white">Period:</span>
            <select
              value={dateRange}
              onChange={(e) => {
                const value = e.target.value as 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all-time' | 'customize';
                setDateRange(value);
                setShowCustomDatePickers(value === 'customize');
              }}
              className="px-3 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <button className="px-3 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white text-sm hover:bg-purple-900/50 focus:outline-none focus:ring-2 focus:ring-purple-500">
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

            <span className="text-sm text-white">to</span>

            <Popover>
              <PopoverTrigger asChild>
                <button className="px-3 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white text-sm hover:bg-purple-900/50 focus:outline-none focus:ring-2 focus:ring-purple-500">
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

      {/* Sales - HERO CARD (LARGEST) */}
      <div className="bg-gradient-to-br from-[#2d1b4e] to-[#1e1538] border-2 border-purple-500 p-8 md:p-10 rounded-2xl shadow-lg shadow-purple-500/30 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-[-50%] right-[-20%] w-64 h-64 bg-purple-500/15 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <DonnaIcon icon={DonnaIcons.profitLens} size="lg" variant="success" />
            <div className="text-xs uppercase tracking-widest opacity-60 font-bold">
              Sales
            </div>
          </div>
          <div className="text-5xl md:text-6xl lg:text-7xl font-black mb-3 text-white">
            {formatCurrency(currentMetrics.revenue)}
          </div>
          <div className="text-sm opacity-50 font-medium flex items-center gap-2">
            Margin:
            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">
              {currentMetrics.profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Total Expenses + Profit - Side by side (SMALLER) */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {/* Total Expenses */}
        <div className="bg-gradient-to-br from-[#2d1b4e] to-[#1e1538] border border-purple-500/30 border-l-4 border-l-red-500 p-4 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <DonnaIcon icon={DonnaIcons.totalExpenses} size="sm" variant="danger" />
            <div className="text-xs uppercase tracking-wide opacity-50 font-semibold">
              Total Expenses
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-1">
            {formatCurrency(currentMetrics.cogs + currentMetrics.operatingExpenses)}
          </div>
          <div className="text-xs opacity-40">
            {currentMetrics.revenue > 0
              ? (((currentMetrics.cogs + currentMetrics.operatingExpenses) / currentMetrics.revenue) * 100).toFixed(1)
              : '0.0'}% of sales
          </div>
        </div>

        {/* Profit */}
        <div className="bg-gradient-to-br from-[#2d1b4e] to-[#1e1538] border border-purple-500/30 border-l-4 border-l-green-500 p-4 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <DonnaIcon icon={DonnaIcons.profit} size="sm" variant="success" />
            <div className="text-xs uppercase tracking-wide opacity-50 font-semibold">
              Profit
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-1">
            {formatCurrency(currentMetrics.netProfit)}
          </div>
          <div className="text-xs opacity-40">
            {currentMetrics.revenue > 0
              ? ((currentMetrics.netProfit / currentMetrics.revenue) * 100).toFixed(1)
              : '0.0'}% of sales
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-white mb-2">Expense Breakdown</h3>
        {expenseBreakdown.length > 0 ? (
          <div className="space-y-2">
            {expenseBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white">{cat.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{formatCurrency(cat.amount)}</span>
                    <span className="text-xs text-purple-400">{cat.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full bg-purple-900/30 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-purple-400 text-sm py-4">No expense data available</p>
        )}
      </div>

      {/* Top 5 Expenses */}
      <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-white mb-3">Top 5 Expenses</h3>
        {topExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-left text-xs text-purple-300 font-medium pb-2 pr-2">Date</th>
                  <th className="text-left text-xs text-purple-300 font-medium pb-2 pr-2">Type</th>
                  <th className="text-right text-xs text-purple-300 font-medium pb-2 pr-2">Amount</th>
                  <th className="text-left text-xs text-purple-300 font-medium pb-2">Vendor</th>
                </tr>
              </thead>
              <tbody>
                {topExpenses.map((expense, index) => (
                  <tr key={expense.id} className={index < topExpenses.length - 1 ? 'border-b border-purple-500/10' : ''}>
                    <td className="py-2 pr-2 text-white">
                      {format(new Date(expense.entry_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-2 pr-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        expense.category === 'COGS'
                          ? 'bg-orange-900/30 text-orange-300 border border-orange-500/30'
                          : expense.category === 'Opex'
                          ? 'bg-blue-900/30 text-blue-300 border border-blue-500/30'
                          : 'bg-gray-900/30 text-gray-300 border border-gray-500/30'
                      }`}>
                        {expense.category}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-right font-medium text-white">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-2 text-white truncate max-w-[120px]">
                      {expense.party?.name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-purple-400 text-sm py-4">No expense data available</p>
        )}
      </div>
    </div>
  )
}
