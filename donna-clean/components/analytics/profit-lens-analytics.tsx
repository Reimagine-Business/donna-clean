'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, DollarSign, Lightbulb, Download, RefreshCw } from 'lucide-react'
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { type Entry } from '@/app/entries/actions'
import {
  getProfitMetrics,
  getProfitTrend,
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
  const [dateRange, setDateRange] = useState<'month' | '3months' | '6months'>('month')
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
    } else if (dateRange === '6months') {
      start = startOfMonth(subMonths(new Date(), 5))
    }

    return { startDate: start, endDate: end }
  }, [dateRange])

  // Calculate metrics
  const currentMetrics = useMemo(() => getProfitMetrics(entries, startDate, endDate), [entries, startDate, endDate])
  const lastMonthMetrics = useMemo(() => {
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1))
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1))
    return getProfitMetrics(entries, lastMonthStart, lastMonthEnd)
  }, [entries])

  const profitTrend = useMemo(() => getProfitTrend(entries, dateRange === 'month' ? 3 : dateRange === '3months' ? 6 : 12), [entries, dateRange])
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
          onChange={(e) => setDateRange(e.target.value as 'month' | '3months' | '6months')}
          className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="month">This Month</option>
          <option value="3months">Last 3 Months</option>
          <option value="6months">Last 6 Months</option>
        </select>
      </div>

      {/* Net Profit Overview */}
      <div className={`bg-gradient-to-br ${currentMetrics.netProfit >= 0 ? 'from-green-900/40 to-green-800/40 border-green-500' : 'from-red-900/40 to-red-800/40 border-red-500'} border-2 rounded-lg p-8 text-center`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <DollarSign className={`w-8 h-8 ${currentMetrics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
          <span className="text-sm text-purple-300 uppercase tracking-wider">Net Profit</span>
        </div>
        <div className={`text-5xl font-bold mb-2 ${currentMetrics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(currentMetrics.netProfit)}
        </div>
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="text-purple-200">
            Margin: {currentMetrics.profitMargin.toFixed(1)}%
          </span>
          {marginChange !== 0 && (
            <span className={`flex items-center gap-1 ${marginChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {marginChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(marginChange).toFixed(1)}% vs last month
            </span>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue"
          amount={currentMetrics.revenue}
          percentage={(currentMetrics.revenue / (currentMetrics.revenue || 1)) * 100}
          color="text-blue-400"
        />
        <MetricCard
          title="COGS"
          amount={currentMetrics.cogs}
          percentage={currentMetrics.revenue > 0 ? (currentMetrics.cogs / currentMetrics.revenue) * 100 : 0}
          color="text-orange-400"
        />
        <MetricCard
          title="Operating Exp."
          amount={currentMetrics.operatingExpenses}
          percentage={currentMetrics.revenue > 0 ? (currentMetrics.operatingExpenses / currentMetrics.revenue) * 100 : 0}
          color="text-red-400"
        />
        <MetricCard
          title="Gross Profit"
          amount={currentMetrics.grossProfit}
          percentage={currentMetrics.revenue > 0 ? (currentMetrics.grossProfit / currentMetrics.revenue) * 100 : 0}
          color="text-green-400"
        />
      </div>

      {/* Profit Trend Chart */}
      <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Profit Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={profitTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
            <XAxis dataKey="month" stroke="#a78bfa" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="left" stroke="#a78bfa" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #7c3aed', borderRadius: '8px' }}
              labelStyle={{ color: '#a78bfa' }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="profit" fill="#8b5cf6" name="Profit" />
            <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#10b981" strokeWidth={2} name="Margin %" />
          </ComposedChart>
        </ResponsiveContainer>
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

interface MetricCardProps {
  title: string
  amount: number
  percentage: number
  color: string
}

function MetricCard({ title, amount, percentage, color }: MetricCardProps) {
  return (
    <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4">
      <div className="text-sm text-purple-300 mb-2">{title}</div>
      <div className={`text-2xl font-bold mb-1 ${color}`}>{formatCurrency(amount)}</div>
      <div className="text-xs text-purple-400">{percentage.toFixed(1)}% of revenue</div>
    </div>
  )
}
