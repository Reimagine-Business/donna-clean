import { type Entry } from '@/app/entries/actions'
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns'

export type CashFlowData = {
  date: string
  cashIn: number
  cashOut: number
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
    cashIn: number
    cashOut: number
    balance: number
  }
  lastMonth: {
    cashIn: number
    cashOut: number
    balance: number
  }
  percentChange: {
    cashIn: number
    cashOut: number
    balance: number
  }
}

// ═══════════════════════════════════════════════════════════
// CASH PULSE LOGIC (Cash-basis accounting)
// ═══════════════════════════════════════════════════════════
// Cash Pulse tracks actual cash movements ONLY:
// - Cash IN: Cash Inflow entries + Advance Sales
// - Cash OUT: Cash Outflow entries + Advance expenses
// - Credit entries do NOT affect Cash Pulse
// ═══════════════════════════════════════════════════════════

// Calculate total cash balance (cash movements only)
export function calculateCashBalance(entries: Entry[]): number {
  // Cash IN: Cash IN + Advance Sales
  const cashIn = entries
    .filter(e =>
      e.entry_type === 'Cash IN' ||
      (e.entry_type === 'Advance' && e.category === 'Sales')
    )
    .reduce((sum, e) => sum + e.amount, 0)

  // Cash OUT: Cash OUT + Advance expenses (COGS, Opex, Assets)
  const cashOut = entries
    .filter(e =>
      e.entry_type === 'Cash OUT' ||
      (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category))
    )
    .reduce((sum, e) => sum + e.amount, 0)

  return cashIn - cashOut
}

// Get total Cash IN for a date range
export function getTotalCashIn(entries: Entry[], startDate?: Date, endDate?: Date): number {
  let filtered = entries.filter(e =>
    e.entry_type === 'Cash IN' ||
    (e.entry_type === 'Advance' && e.category === 'Sales')
  )

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
  }

  return filtered.reduce((sum, e) => sum + e.amount, 0)
}

// Get total Cash OUT for a date range
export function getTotalCashOut(entries: Entry[], startDate?: Date, endDate?: Date): number {
  let filtered = entries.filter(e =>
    e.entry_type === 'Cash OUT' ||
    (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category))
  )

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
  }

  return filtered.reduce((sum, e) => sum + e.amount, 0)
}

// Get cash inflows breakdown by category
export function getCashInByCategory(entries: Entry[], startDate?: Date, endDate?: Date): CategoryBreakdown[] {
  let filtered = entries.filter(e =>
    e.entry_type === 'Cash IN' ||
    (e.entry_type === 'Advance' && e.category === 'Sales')
  )

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
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

// Get cash outflows breakdown by category
export function getCashOutByCategory(entries: Entry[], startDate?: Date, endDate?: Date): CategoryBreakdown[] {
  let filtered = entries.filter(e =>
    e.entry_type === 'Cash OUT' ||
    (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category))
  )

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
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
      const entryDate = new Date(e.entry_date)
      return entryDate >= dayStart && entryDate <= dayEnd
    })

    const cashIn = dayEntries
      .filter(e =>
        e.entry_type === 'Cash IN' ||
        (e.entry_type === 'Advance' && e.category === 'Sales')
      )
      .reduce((sum, e) => sum + e.amount, 0)

    const cashOut = dayEntries
      .filter(e =>
        e.entry_type === 'Cash OUT' ||
        (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category))
      )
      .reduce((sum, e) => sum + e.amount, 0)

    return {
      date: format(date, 'MMM dd'),
      cashIn,
      cashOut,
      net: cashIn - cashOut,
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
  const currentCashIn = getTotalCashIn(entries, currentMonthStart, currentMonthEnd)
  const currentCashOut = getTotalCashOut(entries, currentMonthStart, currentMonthEnd)
  const currentBalance = currentCashIn - currentCashOut

  // Last month
  const lastCashIn = getTotalCashIn(entries, lastMonthStart, lastMonthEnd)
  const lastCashOut = getTotalCashOut(entries, lastMonthStart, lastMonthEnd)
  const lastBalance = lastCashIn - lastCashOut

  // Calculate percent changes
  const cashInChange = lastCashIn > 0 ? ((currentCashIn - lastCashIn) / lastCashIn) * 100 : 0
  const cashOutChange = lastCashOut > 0 ? ((currentCashOut - lastCashOut) / lastCashOut) * 100 : 0
  const balanceChange = lastBalance !== 0 ? ((currentBalance - lastBalance) / Math.abs(lastBalance)) * 100 : 0

  return {
    currentMonth: {
      cashIn: currentCashIn,
      cashOut: currentCashOut,
      balance: currentBalance,
    },
    lastMonth: {
      cashIn: lastCashIn,
      cashOut: lastCashOut,
      balance: lastBalance,
    },
    percentChange: {
      cashIn: cashInChange,
      cashOut: cashOutChange,
      balance: balanceChange,
    },
  }
}

// Get count of cash entries
export function getCashEntryCount(entries: Entry[], type?: 'in' | 'out', startDate?: Date, endDate?: Date): number {
  let filtered: Entry[]

  if (type === 'in') {
    filtered = entries.filter(e =>
      e.entry_type === 'Cash IN' ||
      (e.entry_type === 'Advance' && e.category === 'Sales')
    )
  } else if (type === 'out') {
    filtered = entries.filter(e =>
      e.entry_type === 'Cash OUT' ||
      (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category))
    )
  } else {
    filtered = entries.filter(e =>
      e.entry_type === 'Cash IN' ||
      e.entry_type === 'Cash OUT' ||
      e.entry_type === 'Advance'
    )
  }

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
  }

  return filtered.length
}

// Legacy exports for backwards compatibility (will be removed)
export const getExpensesByCategory = getCashOutByCategory
export const getIncomeByCategory = getCashInByCategory
export const getTotalIncome = getTotalCashIn
export const getTotalExpenses = getTotalCashOut
export const getEntryCount = getCashEntryCount
