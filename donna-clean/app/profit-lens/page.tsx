'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'

type DateRange = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all_time'

interface Transaction {
  id: string
  amount: number
  type: 'credit' | 'debit'
  category: string
  date: string
  description: string
}

export default function ProfitLens() {
  const [user, setUser] = useState<User | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [dateRange, setDateRange] = useState<DateRange>('this_month')
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get date range boundaries
  const getDateBoundaries = (range: DateRange): { start: Date; end: Date } | null => {
    const now = new Date()
    
    switch (range) {
      case 'this_month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        }
      case 'last_month':
        const lastMonth = subMonths(now, 1)
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        }
      case 'this_year':
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        }
      case 'last_year':
        const lastYear = new Date(now.getFullYear() - 1, 0, 1)
        return {
          start: startOfYear(lastYear),
          end: endOfYear(lastYear)
        }
      case 'all_time':
        return null
    }
  }

  // Fetch user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  // Fetch all transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return

      setLoading(true)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error)
      } else {
        setTransactions(data || [])
      }
      setLoading(false)
    }

    fetchTransactions()
  }, [user, supabase])

  // Filter transactions based on date range
  useEffect(() => {
    const boundaries = getDateBoundaries(dateRange)
    
    if (!boundaries) {
      // All time - show everything
      setFilteredTransactions(transactions)
    } else {
      // Filter by date range
      const filtered = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date)
        return transactionDate >= boundaries.start && transactionDate <= boundaries.end
      })
      setFilteredTransactions(filtered)
    }
  }, [dateRange, transactions])

  // Calculate P&L
  const calculatePL = () => {
    const revenue = filteredTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const grossProfit = revenue - expenses
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
    const netProfit = grossProfit
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

    // Expense breakdown by category
    const expensesByCategory: { [key: string]: number } = {}
    filteredTransactions
      .filter(t => t.type === 'debit')
      .forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount
      })

    return {
      revenue,
      expenses,
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      expensesByCategory
    }
  }

  const { revenue, expenses, grossProfit, grossMargin, netProfit, netMargin, expensesByCategory } = calculatePL()

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'this_month':
        return format(new Date(), 'MMMM yyyy')
      case 'last_month':
        return format(subMonths(new Date(), 1), 'MMMM yyyy')
      case 'this_year':
        return format(new Date(), 'yyyy')
      case 'last_year':
        return `${new Date().getFullYear() - 1}`
      case 'all_time':
        return 'All Time'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0f1e]">
        <div className="text-purple-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f1e] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900 to-purple-800 px-4 py-6 md:px-6 md:py-8">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-4">📊 Profit Lens</h1>
        
        {/* Date Filter Dropdown */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className="w-full md:w-auto px-3 py-2 bg-purple-800/50 text-white text-sm md:text-base rounded-lg border border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_year">This Year</option>
          <option value="last_year">Last Year</option>
          <option value="all_time">All Time</option>
        </select>
        
        <div className="text-purple-200 text-xs md:text-sm mt-2">
          P&L Statement: {getDateRangeLabel()}
        </div>
      </div>

      {/* P&L Summary */}
      <div className="px-4 py-6 md:px-6 space-y-3">
        {/* Revenue */}
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-xl p-4 border border-green-700/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-green-300 text-xs md:text-sm font-medium">Total Revenue</p>
              <p className="text-white text-xl md:text-2xl font-bold mt-1">
                ₹{revenue.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-2xl md:text-3xl">💰</div>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-xl p-4 border border-red-700/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-red-300 text-xs md:text-sm font-medium">Total Expenses</p>
              <p className="text-white text-xl md:text-2xl font-bold mt-1">
                ₹{expenses.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-2xl md:text-3xl">💸</div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className={`bg-gradient-to-br ${
          grossProfit >= 0 
            ? 'from-purple-900/40 to-purple-800/30 border-purple-700/40' 
            : 'from-red-900/40 to-red-800/30 border-red-700/40'
        } rounded-xl p-4 border`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <p className={`${grossProfit >= 0 ? 'text-purple-300' : 'text-red-300'} text-xs md:text-sm font-medium`}>
                Gross Profit
              </p>
              <p className="text-white text-xl md:text-2xl font-bold mt-1">
                ₹{grossProfit.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-2xl md:text-3xl">
              {grossProfit >= 0 ? '✅' : '⚠️'}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-700/30">
            <span className="text-purple-400 text-[10px] md:text-xs">Gross Margin</span>
            <span className={`text-xs md:text-sm font-semibold ${grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {grossMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`bg-gradient-to-br ${
          netProfit >= 0 
            ? 'from-purple-900/40 to-purple-800/30 border-purple-700/40' 
            : 'from-red-900/40 to-red-800/30 border-red-700/40'
        } rounded-xl p-4 border`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <p className={`${netProfit >= 0 ? 'text-purple-300' : 'text-red-300'} text-xs md:text-sm font-medium`}>
                Net Profit
              </p>
              <p className="text-white text-xl md:text-2xl font-bold mt-1">
                ₹{netProfit.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-2xl md:text-3xl">
              {netProfit >= 0 ? '🎯' : '📉'}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-700/30">
            <span className="text-purple-400 text-[10px] md:text-xs">Net Margin</span>
            <span className={`text-xs md:text-sm font-semibold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="px-4 md:px-6 mb-6">
        <h2 className="text-white text-base md:text-lg font-semibold mb-3">Expense Breakdown</h2>
        
        {Object.keys(expensesByCategory).length === 0 ? (
          <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-700/30 text-center">
            <p className="text-purple-300 text-sm">No expenses found for this period</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(expensesByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => {
                const percentage = expenses > 0 ? (amount / expenses) * 100 : 0
                return (
                  <div
                    key={category}
                    className="bg-purple-900/20 rounded-lg p-3 border border-purple-700/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-xs md:text-sm font-medium capitalize">
                        {category}
                      </span>
                      <span className="text-red-400 text-xs md:text-sm font-semibold">
                        ₹{amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-purple-900/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-purple-400 text-[10px] md:text-xs font-medium">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="px-4 md:px-6">
        <h2 className="text-white text-base md:text-lg font-semibold mb-3">Key Metrics</h2>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-700/30">
            <p className="text-purple-400 text-[10px] md:text-xs mb-1">Transaction Count</p>
            <p className="text-white text-base md:text-lg font-bold">
              {filteredTransactions.length}
            </p>
          </div>
          
          <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-700/30">
            <p className="text-purple-400 text-[10px] md:text-xs mb-1">Avg Transaction</p>
            <p className="text-white text-base md:text-lg font-bold">
              ₹{filteredTransactions.length > 0 
                ? Math.round((revenue + expenses) / filteredTransactions.length).toLocaleString('en-IN')
                : '0'
              }
            </p>
          </div>
          
          <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-700/30">
            <p className="text-purple-400 text-[10px] md:text-xs mb-1">Revenue Count</p>
            <p className="text-white text-base md:text-lg font-bold">
              {filteredTransactions.filter(t => t.type === 'credit').length}
            </p>
          </div>
          
          <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-700/30">
            <p className="text-purple-400 text-[10px] md:text-xs mb-1">Expense Count</p>
            <p className="text-white text-base md:text-lg font-bold">
              {filteredTransactions.filter(t => t.type === 'debit').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
