'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Lightbulb, Download, RefreshCw, TrendingUpIcon } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { type Entry } from '@/app/entries/actions'
import {
  getProfitMetrics,
  getExpenseBreakdown,
  getRecommendations,
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
  const recommendations = useMemo(() => getRecommendations(entries, startDate, endDate), [entries, startDate, endDate])

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

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Profit Lens</h1>
          <p className="text-purple-300 mt-1">Profit & loss analysis</p>
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
          onChange={(e) => setDateRange(e.target.value as 'month' | '3months' | '6months' | 'all')}
          className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="month">This Month</option>
          <option value="3months">Last 3 Months</option>
          <option value="6months">Last 6 Months</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Sales Overview */}
      <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 border-2 border-blue-500 rounded-lg p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TrendingUpIcon className="w-8 h-8 text-blue-400" />
          <span className="text-sm text-purple-300 uppercase tracking-wider">SALES</span>
        </div>
        <div className="text-5xl font-bold mb-2 text-blue-400">
          {formatCurrency(currentMetrics.revenue)}
        </div>
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="text-purple-200">
            100.0% of revenue
          </span>
          {marginChange !== 0 && (
            <span className={`flex items-center gap-1 ${marginChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              Margin: {currentMetrics.profitMargin.toFixed(1)}%
              {marginChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(marginChange).toFixed(1)}% vs last month
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Expenses */}
        <div className="bg-orange-900/20 border-2 border-orange-500/50 rounded-lg p-6">
          <div className="text-sm text-orange-300 mb-2 uppercase tracking-wider">TOTAL EXPENSES</div>
          <div className="text-4xl font-bold mb-2 text-orange-400">
            {formatCurrency(currentMetrics.cogs + currentMetrics.operatingExpenses)}
          </div>
          <div className="text-sm text-orange-200">
            {currentMetrics.revenue > 0
              ? (((currentMetrics.cogs + currentMetrics.operatingExpenses) / currentMetrics.revenue) * 100).toFixed(1)
              : '0.0'}% of sales
          </div>
        </div>

        {/* Profit */}
        <div className={`${currentMetrics.netProfit >= 0 ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'} border-2 rounded-lg p-6`}>
          <div className={`text-sm mb-2 uppercase tracking-wider ${currentMetrics.netProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>PROFIT</div>
          <div className={`text-4xl font-bold mb-2 ${currentMetrics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(currentMetrics.netProfit)}
          </div>
          <div className={`text-sm ${currentMetrics.netProfit >= 0 ? 'text-green-200' : 'text-red-200'}`}>
            {currentMetrics.revenue > 0
              ? ((currentMetrics.netProfit / currentMetrics.revenue) * 100).toFixed(1)
              : '0.0'}% of sales
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Expense Breakdown</h2>
          {expenseBreakdown.length > 0 ? (
            <div className="space-y-3">
              {expenseBreakdown.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-purple-300">{cat.category}</span>
                    <span className="text-sm text-white font-medium">{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-purple-900/30 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-purple-400 w-12 text-right">{cat.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-purple-400 py-8">No expense data available</p>
          )}
        </div>

        {/* Insights & Recommendations */}
        <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">Insights</h2>
          </div>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-purple-200">{rec}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-purple-400 py-8">No insights available yet. Add more entries to see recommendations.</p>
          )}
        </div>
      </div>
    </div>
  )
}
