'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Download, RefreshCw, TrendingUpIcon } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { type Entry } from '@/app/entries/actions'
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
  const [dateRange, setDateRange] = useState<'month' | '3months' | '6months' | 'all'>('month')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Log received data
  useEffect(() => {
    console.log('🎨 [PROFIT_LENS_COMPONENT] Component mounted/updated')
    console.log('📊 [PROFIT_LENS_COMPONENT] Entries received:', entries?.length || 0)
    if (entries && entries.length > 0) {
      console.log('📊 [PROFIT_LENS_COMPONENT] First entry:', entries[0])
      console.log('📊 [PROFIT_LENS_COMPONENT] Entry types:', {
        cashIn: entries.filter(e => e.entry_type === 'Cash IN').length,
        cashOut: entries.filter(e => e.entry_type === 'Cash OUT').length,
        credit: entries.filter(e => e.entry_type === 'Credit').length,
        advance: entries.filter(e => e.entry_type === 'Advance').length,
      })
    } else {
      console.warn('⚠️ [PROFIT_LENS_COMPONENT] No entries received or entries is empty')
      console.warn('⚠️ [PROFIT_LENS_COMPONENT] Entries value:', entries)
    }
  }, [entries])

  // Refresh data on mount to ensure latest entries are shown
  useEffect(() => {
    console.log('🔄 [PROFIT_LENS_COMPONENT] Refreshing router')
    router.refresh()
  }, [router])

  // Calculate date ranges
  const { startDate, endDate } = useMemo(() => {
    // If 'all' is selected, don't apply any date filters
    if (dateRange === 'all') {
      console.log('📅 [PROFIT_LENS_COMPONENT] Date range: ALL TIME (no filters)')
      return { startDate: undefined, endDate: undefined }
    }

    const end = endOfMonth(new Date())
    let start = startOfMonth(new Date())

    if (dateRange === '3months') {
      start = startOfMonth(subMonths(new Date(), 2))
    } else if (dateRange === '6months') {
      start = startOfMonth(subMonths(new Date(), 5))
    }

    console.log('📅 [PROFIT_LENS_COMPONENT] Date range calculated:', {
      range: dateRange,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    })

    return { startDate: start, endDate: end }
  }, [dateRange])

  // Calculate metrics
  const currentMetrics = useMemo(() => {
    console.log('🧮 [PROFIT_LENS_COMPONENT] Calculating metrics with:', entries?.length || 0, 'entries')
    console.log('🧮 [PROFIT_LENS_COMPONENT] Date filters:', {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      dateRange
    })

    // Log all Sales entries before calculation
    const salesEntries = entries.filter(e => e.category === 'Sales')
    console.log('🧮 [PROFIT_LENS_COMPONENT] Total Sales entries found:', salesEntries.length)
    console.log('🧮 [PROFIT_LENS_COMPONENT] Sales entries breakdown:', salesEntries.map(e => ({
      type: e.entry_type,
      amount: e.amount,
      date: e.entry_date,
      settled: e.settled,
      notes: e.notes?.substring(0, 30)
    })))

    const metrics = getProfitMetrics(entries, startDate, endDate)
    console.log('💰 [PROFIT_LENS_COMPONENT] Metrics calculated:', metrics)
    console.log('💰 [PROFIT_LENS_COMPONENT] Revenue from metrics:', metrics.revenue)
    return metrics
  }, [entries, startDate, endDate, dateRange])

  const lastMonthMetrics = useMemo(() => {
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1))
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1))
    return getProfitMetrics(entries, lastMonthStart, lastMonthEnd)
  }, [entries])

  const expenseBreakdown = useMemo(() => getExpenseBreakdown(entries, startDate, endDate), [entries, startDate, endDate])

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">See what you earned!</h1>

        <div className="flex items-center gap-2">
          {/* Period Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Period:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'month' | '3months' | '6months' | 'all')}
              className="px-3 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="month">This Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-purple-500 text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-purple-600 transition-colors"
            aria-label="Export CSV"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Sales Overview */}
      <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 border-2 border-blue-500 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUpIcon className="w-5 h-5 text-blue-400" />
          <span className="text-xs text-purple-300 uppercase tracking-wider font-medium">SALES</span>
        </div>
        <div className="text-4xl font-bold mb-1 text-blue-400">
          {formatCurrency(currentMetrics.revenue)}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {marginChange !== 0 && (
            <span className={`flex items-center gap-1 ${marginChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              Margin: {currentMetrics.profitMargin.toFixed(1)}%
              {marginChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(marginChange).toFixed(1)}% vs last month
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* Total Expenses */}
        <div className="bg-orange-900/20 border-2 border-orange-500/50 rounded-lg p-3">
          <div className="text-xs text-orange-300 mb-1.5 uppercase tracking-wider font-medium">TOTAL EXPENSES</div>
          <div className="text-2xl font-bold mb-1 text-orange-400">
            {formatCurrency(currentMetrics.cogs + currentMetrics.operatingExpenses)}
          </div>
          <div className="text-xs text-orange-200">
            {currentMetrics.revenue > 0
              ? (((currentMetrics.cogs + currentMetrics.operatingExpenses) / currentMetrics.revenue) * 100).toFixed(1)
              : '0.0'}% of sales
          </div>
        </div>

        {/* Profit */}
        <div className={`${currentMetrics.netProfit >= 0 ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'} border-2 rounded-lg p-3`}>
          <div className={`text-xs mb-1.5 uppercase tracking-wider font-medium ${currentMetrics.netProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>PROFIT</div>
          <div className={`text-2xl font-bold mb-1 ${currentMetrics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(currentMetrics.netProfit)}
          </div>
          <div className={`text-xs ${currentMetrics.netProfit >= 0 ? 'text-green-200' : 'text-red-200'}`}>
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
                  <span className="text-sm text-purple-200">{cat.category}</span>
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
    </div>
  )
}
