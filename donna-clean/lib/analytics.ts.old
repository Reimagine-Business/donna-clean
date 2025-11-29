import { type Entry } from '@/app/entries/actions'
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns'

export type CashFlowData = {
  date: string
  income: number
  expenses: number
  net: number
}

export type CategoryBreakdown = {
  category: string
  amount: number
  count: number
  percentage: number
}

export type MonthlyComparison = {
  currentMonth: {
    income: number
    expenses: number
    balance: number
  }
  lastMonth: {
    income: number
    expenses: number
    balance: number
  }
  percentChange: {
    income: number
    expenses: number
    balance: number
  }
}

// Calculate total cash balance (all-time income - expenses)
export function calculateCashBalance(entries: Entry[]): number {
  return entries.reduce((acc, entry) => {
    return entry.type === 'income' ? acc + entry.amount : acc - entry.amount
  }, 0)
}

// Get total income for a date range
export function getTotalIncome(entries: Entry[], startDate?: Date, endDate?: Date): number {
  let filtered = entries.filter(e => e.type === 'income')

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.date) <= endDate)
  }

  return filtered.reduce((sum, e) => sum + e.amount, 0)
}

// Get total expenses for a date range
export function getTotalExpenses(entries: Entry[], startDate?: Date, endDate?: Date): number {
  let filtered = entries.filter(e => e.type === 'expense')

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.date) <= endDate)
  }

  return filtered.reduce((sum, e) => sum + e.amount, 0)
}

// Get income breakdown by category
export function getIncomeByCategory(entries: Entry[], startDate?: Date, endDate?: Date): CategoryBreakdown[] {
  let filtered = entries.filter(e => e.type === 'income')

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.date) <= endDate)
  }

  const categoryMap = new Map<string, { amount: number; count: number }>()

  filtered.forEach(entry => {
    const existing = categoryMap.get(entry.category) || { amount: 0, count: 0 }
    categoryMap.set(entry.category, {
      amount: existing.amount + entry.amount,
      count: existing.count + 1,
    })
  })

  const total = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0)

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

// Get expenses breakdown by category
export function getExpensesByCategory(entries: Entry[], startDate?: Date, endDate?: Date): CategoryBreakdown[] {
  let filtered = entries.filter(e => e.type === 'expense')

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.date) <= endDate)
  }

  const categoryMap = new Map<string, { amount: number; count: number }>()

  filtered.forEach(entry => {
    const existing = categoryMap.get(entry.category) || { amount: 0, count: 0 }
    categoryMap.set(entry.category, {
      amount: existing.amount + entry.amount,
      count: existing.count + 1,
    })
  })

  const total = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0)

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

// Get cash flow trend over last N days
export function getCashFlowTrend(entries: Entry[], days: number = 30): CashFlowData[] {
  const endDate = endOfDay(new Date())
  const startDate = startOfDay(new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000))

  const dateRange = eachDayOfInterval({ start: startDate, end: endDate })

  return dateRange.map(date => {
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    const dayEntries = entries.filter(e => {
      const entryDate = new Date(e.date)
      return entryDate >= dayStart && entryDate <= dayEnd
    })

    const income = dayEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0)

    const expenses = dayEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0)

    return {
      date: format(date, 'MMM dd'),
      income,
      expenses,
      net: income - expenses,
    }
  })
}

// Get monthly comparison (current vs last month)
export function getMonthlyComparison(entries: Entry[]): MonthlyComparison {
  const now = new Date()
  const currentMonthStart = startOfMonth(now)
  const currentMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  // Current month
  const currentIncome = getTotalIncome(entries, currentMonthStart, currentMonthEnd)
  const currentExpenses = getTotalExpenses(entries, currentMonthStart, currentMonthEnd)
  const currentBalance = currentIncome - currentExpenses

  // Last month
  const lastIncome = getTotalIncome(entries, lastMonthStart, lastMonthEnd)
  const lastExpenses = getTotalExpenses(entries, lastMonthStart, lastMonthEnd)
  const lastBalance = lastIncome - lastExpenses

  // Calculate percent changes
  const incomeChange = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0
  const expensesChange = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0
  const balanceChange = lastBalance !== 0 ? ((currentBalance - lastBalance) / Math.abs(lastBalance)) * 100 : 0

  return {
    currentMonth: {
      income: currentIncome,
      expenses: currentExpenses,
      balance: currentBalance,
    },
    lastMonth: {
      income: lastIncome,
      expenses: lastExpenses,
      balance: lastBalance,
    },
    percentChange: {
      income: incomeChange,
      expenses: expensesChange,
      balance: balanceChange,
    },
  }
}

// Get count of entries
export function getEntryCount(entries: Entry[], type?: 'income' | 'expense', startDate?: Date, endDate?: Date): number {
  let filtered = type ? entries.filter(e => e.type === type) : entries

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.date) <= endDate)
  }

  return filtered.length
}
