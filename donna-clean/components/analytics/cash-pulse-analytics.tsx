'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Download, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { type Entry } from '@/app/entries/actions'
import {
  calculateCashBalance,
  getTotalIncome,
  getTotalExpenses,
  getExpensesByCategory,
  getCashFlowTrend,
  getMonthlyComparison,
  getEntryCount,
} from '@/lib/analytics-new'
import { showSuccess } from '@/lib/toast'

interface CashPulseAnalyticsProps {
  entries: Entry[]
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CashPulseAnalytics({ entries }: CashPulseAnalyticsProps) {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<'month' | '3months' | 'year'>('month')
  const [chartDays, setChartDays] = useState(30)
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
    } else if (dateRange === 'year') {
      start = startOfMonth(subMonths(new Date(), 11))
    }

    return { startDate: start, endDate: end }
  }, [dateRange])

  // Calculate metrics
  const cashBalance = useMemo(() => calculateCashBalance(entries), [entries])
  const totalIncome = useMemo(() => getTotalIncome(entries, startDate, endDate), [entries, startDate, endDate])
  const totalExpenses = useMemo(() => getTotalExpenses(entries, startDate, endDate), [entries, startDate, endDate])
  const monthlyComparison = useMemo(() => getMonthlyComparison(entries), [entries])
  const expensesByCategory = useMemo(() => getExpensesByCategory(entries, startDate, endDate).slice(0, 5), [entries, startDate, endDate])
  const cashFlowData = useMemo(() => getCashFlowTrend(entries, chartDays), [entries, chartDays])
  const incomeCount = useMemo(() => getEntryCount(entries, 'in', startDate, endDate), [entries, startDate, endDate])
  const expenseCount = useMemo(() => getEntryCount(entries, 'out', startDate, endDate), [entries, startDate, endDate])

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return entries
      .slice()
      .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
      .slice(0, 10)
  }, [entries])

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
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cash Pulse</h1>
          <p className="text-purple-300 mt-1">Financial analytics and insights</p>
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
          onChange={(e) => {
            setDateRange(e.target.value as 'month' | '3months' | 'year')
            setChartDays(e.target.value === 'month' ? 30 : e.target.value === '3months' ? 90 : 365)
          }}
          className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="month">This Month</option>
          <option value="3months">Last 3 Months</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash Balance */}
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-purple-300 uppercase tracking-wider">Cash Balance</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">{formatCurrency(cashBalance)}</div>
          <div className={`flex items-center gap-1 text-sm ${cashBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {cashBalance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{cashBalance >= 0 ? 'Positive' : 'Negative'}</span>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-2 border-green-500 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-green-400" />
            <span className="text-sm text-green-300 uppercase tracking-wider">Income</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">{formatCurrency(totalIncome)}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-200">{incomeCount} entries</span>
            {monthlyComparison.percentChange.cashIn !== 0 && (
              <span className={`text-sm flex items-center gap-1 ${monthlyComparison.percentChange.cashIn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {monthlyComparison.percentChange.cashIn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(monthlyComparison.percentChange.cashIn).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-2 border-red-500 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-300 uppercase tracking-wider">Expenses</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">{formatCurrency(totalExpenses)}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-200">{expenseCount} entries</span>
            {monthlyComparison.percentChange.cashOut !== 0 && (
              <span className={`text-sm flex items-center gap-1 ${monthlyComparison.percentChange.cashOut >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                {monthlyComparison.percentChange.cashOut >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(monthlyComparison.percentChange.cashOut).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Cash Flow Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cashFlowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
            <XAxis dataKey="date" stroke="#a78bfa" style={{ fontSize: '12px' }} />
            <YAxis stroke="#a78bfa" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #7c3aed', borderRadius: '8px' }}
              labelStyle={{ color: '#a78bfa' }}
            />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
            <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={2} name="Net" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Expense by Category</h2>
          {expensesByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.category} (${entry.percentage.toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #7c3aed', borderRadius: '8px' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {expensesByCategory.map((cat, idx) => (
                  <div key={cat.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-purple-300">{cat.category}</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-purple-400 py-8">No expense data available</p>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Transactions</h2>
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {recentTransactions.length > 0 ? (
              recentTransactions.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        entry.entry_type === 'Cash IN' || (entry.entry_type === 'Advance' && entry.category === 'Sales')
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}>
                        {entry.entry_type}
                      </span>
                      <span className="text-sm text-white">{entry.category}</span>
                    </div>
                    <div className="text-xs text-purple-400 mt-1">{format(new Date(entry.entry_date), 'MMM dd, yyyy')}</div>
                  </div>
                  <div className={`text-lg font-semibold ${
                    entry.entry_type === 'Cash IN' || (entry.entry_type === 'Advance' && entry.category === 'Sales')
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {entry.entry_type === 'Cash IN' || (entry.entry_type === 'Advance' && entry.category === 'Sales') ? '+' : '-'}{formatCurrency(entry.amount)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-purple-400 py-8">No transactions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
