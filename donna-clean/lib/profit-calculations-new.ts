import { type Entry } from '@/app/entries/actions'
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval } from 'date-fns'

export type ProfitMetrics = {
  revenue: number
  cogs: number
  grossProfit: number
  operatingExpenses: number
  netProfit: number
  profitMargin: number
}

export type ProfitTrendData = {
  month: string
  revenue: number
  expenses: number
  profit: number
  margin: number
}

export type CategoryExpense = {
  category: string
  amount: number
  percentage: number
}

// ═══════════════════════════════════════════════════════════
// PROFIT LENS LOGIC (Accrual-basis accounting)
// ═══════════════════════════════════════════════════════════
// Profit Lens tracks revenue and expenses when earned/incurred:
// - Revenue: Cash IN (Sales)* + Credit (Sales) + SETTLED Advance (Sales)
// - COGS: Cash OUT (COGS)* + Credit (COGS) + SETTLED Advance (COGS)
// - OpEx: Cash OUT (Opex)* + Credit (Opex) + SETTLED Advance (Opex)
// - UNSETTLED Advance entries do NOT affect Profit Lens (not yet earned/incurred)
// - Assets do NOT affect Profit Lens (not an expense)
//
// *CRITICAL: Cash IN/OUT entries with notes starting "Settlement of" are EXCLUDED
//  to prevent double-counting (P&L already recorded when original entry was created)
//
// Settlement Logic:
// - Credit entries: Create new Cash IN/OUT when settled (for Cash Pulse only, NOT P&L)
// - Advance entries: Mark as settled (P&L recorded ONLY when settled)
// ═══════════════════════════════════════════════════════════

// Calculate revenue (Sales from Cash IN + Credit + Settled Advance)
export function calculateRevenue(entries: Entry[], startDate?: Date, endDate?: Date): number {
  console.log('🔍 [REVENUE] ==================== START ====================')
  console.log('🔍 [REVENUE] Total entries received:', entries.length)
  console.log('🔍 [REVENUE] Date filter:', { startDate, endDate })

  // Log all Sales entries to debug
  const allSalesEntries = entries.filter(e => e.category === 'Sales')
  console.log('🔍 [REVENUE] Sales entries found:', allSalesEntries.length)

  // Breakdown by type and settled status
  const salesByType = {
    cashIn: allSalesEntries.filter(e => e.entry_type === 'Cash IN'),
    credit: allSalesEntries.filter(e => e.entry_type === 'Credit'),
    advance: allSalesEntries.filter(e => e.entry_type === 'Advance'),
  }

  console.log('🔍 [REVENUE] Sales by type:', {
    cashIn: { count: salesByType.cashIn.length, total: salesByType.cashIn.reduce((sum, e) => sum + e.amount, 0) },
    cashInSettlements: salesByType.cashIn.filter(e => e.notes?.startsWith('Settlement of')).length,
    credit: { count: salesByType.credit.length, total: salesByType.credit.reduce((sum, e) => sum + e.amount, 0) },
    creditSettled: salesByType.credit.filter(e => e.settled).length,
    creditUnsettled: salesByType.credit.filter(e => !e.settled).length,
    advance: { count: salesByType.advance.length, total: salesByType.advance.reduce((sum, e) => sum + e.amount, 0) },
    advanceSettled: salesByType.advance.filter(e => e.settled).length,
    advanceUnsettled: salesByType.advance.filter(e => !e.settled).length,
  })

  console.log('🔍 [REVENUE] Sample Sales entries:', allSalesEntries.slice(0, 5).map(e => ({
    id: e.id.substring(0, 8),
    type: e.entry_type,
    amount: e.amount,
    settled: e.settled,
    notes: e.notes?.substring(0, 30),
    date: e.entry_date
  })))

  let filtered = entries.filter(e =>
    e.category === 'Sales' &&
    (
      // Cash IN ONLY if NOT a settlement entry (prevents double-counting)
      (e.entry_type === 'Cash IN' && !e.notes?.startsWith('Settlement of')) ||
      e.entry_type === 'Credit' ||
      (e.entry_type === 'Advance' && e.settled === true)  // ✅ Include settled Advance
    )
  )

  console.log('🔍 [REVENUE] After type filter:', filtered.length)
  console.log('🔍 [REVENUE] Breakdown after type filter:', {
    cashIn: filtered.filter(e => e.entry_type === 'Cash IN').length,
    credit: filtered.filter(e => e.entry_type === 'Credit').length,
    creditUnsettled: filtered.filter(e => e.entry_type === 'Credit' && !e.settled).length,
    advanceSettled: filtered.filter(e => e.entry_type === 'Advance' && e.settled).length,
  })

  if (startDate) {
    const beforeDateFilter = filtered.length
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
    console.log(`🔍 [REVENUE] After startDate filter (${startDate.toISOString()}):`, filtered.length, `(removed ${beforeDateFilter - filtered.length})`)
  }
  if (endDate) {
    const beforeDateFilter = filtered.length
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
    console.log(`🔍 [REVENUE] After endDate filter (${endDate.toISOString()}):`, filtered.length, `(removed ${beforeDateFilter - filtered.length})`)
  }

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)
  console.log('🔍 [REVENUE] FINAL REVENUE:', total.toLocaleString('en-IN'))
  console.log('🔍 [REVENUE] Final breakdown:', {
    cashIn: filtered.filter(e => e.entry_type === 'Cash IN').reduce((sum, e) => sum + e.amount, 0),
    credit: filtered.filter(e => e.entry_type === 'Credit').reduce((sum, e) => sum + e.amount, 0),
    creditUnsettled: filtered.filter(e => e.entry_type === 'Credit' && !e.settled).reduce((sum, e) => sum + e.amount, 0),
    advanceSettled: filtered.filter(e => e.entry_type === 'Advance' && e.settled).reduce((sum, e) => sum + e.amount, 0),
  })
  console.log('🔍 [REVENUE] ==================== END ====================')

  return total
}

// Calculate COGS (Cost of Goods Sold from Cash OUT + Credit + Settled Advance)
export function calculateCOGS(entries: Entry[], startDate?: Date, endDate?: Date): number {
  console.log('🔍 [COGS] Total entries received:', entries.length)

  const allCOGSEntries = entries.filter(e => e.category === 'COGS')
  console.log('🔍 [COGS] COGS entries found:', allCOGSEntries.length)
  console.log('🔍 [COGS] COGS breakdown:', allCOGSEntries.map(e => ({
    type: e.entry_type,
    amount: e.amount,
    settled: e.settled,
    notes: e.notes
  })))

  let filtered = entries.filter(e =>
    e.category === 'COGS' &&
    (
      // Cash OUT ONLY if NOT a settlement entry (prevents double-counting)
      (e.entry_type === 'Cash OUT' && !e.notes?.startsWith('Settlement of')) ||
      e.entry_type === 'Credit' ||
      (e.entry_type === 'Advance' && e.settled === true)  // ✅ Include settled Advance
    )
  )

  console.log('🔍 [COGS] Filtered COGS entries (for P&L):', filtered.length)

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
  }

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)
  console.log('🔍 [COGS] Total COGS calculated:', total)

  return total
}

// Calculate Gross Profit
export function calculateGrossProfit(revenue: number, cogs: number): number {
  return revenue - cogs
}

// Calculate Operating Expenses (Opex from Cash OUT + Credit + Settled Advance, NO Assets)
export function calculateOperatingExpenses(entries: Entry[], startDate?: Date, endDate?: Date): number {
  console.log('🔍 [OPEX] Total entries received:', entries.length)

  const allOpexEntries = entries.filter(e => e.category === 'Opex')
  console.log('🔍 [OPEX] Opex entries found:', allOpexEntries.length)
  console.log('🔍 [OPEX] Opex breakdown:', allOpexEntries.map(e => ({
    type: e.entry_type,
    amount: e.amount,
    settled: e.settled,
    notes: e.notes
  })))

  let filtered = entries.filter(e =>
    e.category === 'Opex' &&
    (
      // Cash OUT ONLY if NOT a settlement entry (prevents double-counting)
      (e.entry_type === 'Cash OUT' && !e.notes?.startsWith('Settlement of')) ||
      e.entry_type === 'Credit' ||
      (e.entry_type === 'Advance' && e.settled === true)  // ✅ Include settled Advance
    )
  )

  console.log('🔍 [OPEX] Filtered Opex entries (for P&L):', filtered.length)

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
  }

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)
  console.log('🔍 [OPEX] Total Opex calculated:', total)

  return total
}

// Calculate Net Profit
export function calculateNetProfit(grossProfit: number, operatingExpenses: number): number {
  return grossProfit - operatingExpenses
}

// Calculate Profit Margin
export function calculateProfitMargin(netProfit: number, revenue: number): number {
  return revenue > 0 ? (netProfit / revenue) * 100 : 0
}

// Get all profit metrics for a period
export function getProfitMetrics(entries: Entry[], startDate?: Date, endDate?: Date): ProfitMetrics {
  const revenue = calculateRevenue(entries, startDate, endDate)
  const cogs = calculateCOGS(entries, startDate, endDate)
  const grossProfit = calculateGrossProfit(revenue, cogs)
  const operatingExpenses = calculateOperatingExpenses(entries, startDate, endDate)
  const netProfit = calculateNetProfit(grossProfit, operatingExpenses)
  const profitMargin = calculateProfitMargin(netProfit, revenue)

  return {
    revenue,
    cogs,
    grossProfit,
    operatingExpenses,
    netProfit,
    profitMargin,
  }
}

// Get profit trend over last N months
export function getProfitTrend(entries: Entry[], months: number = 6): ProfitTrendData[] {
  const endDate = endOfMonth(new Date())
  const startDate = startOfMonth(subMonths(new Date(), months - 1))

  const monthRange = eachMonthOfInterval({ start: startDate, end: endDate })

  return monthRange.map(monthStart => {
    const monthEnd = endOfMonth(monthStart)

    const revenue = calculateRevenue(entries, monthStart, monthEnd)

    // Total expenses = COGS + Opex (excluding ALL settlements to avoid double-counting)
    const totalExpenses = entries
      .filter(e =>
        ['COGS', 'Opex'].includes(e.category) &&
        (
          // Cash OUT ONLY if NOT a settlement entry (prevents double-counting)
          (e.entry_type === 'Cash OUT' && !e.notes?.startsWith('Settlement of')) ||
          e.entry_type === 'Credit' ||
          (e.entry_type === 'Advance' && e.settled === true)  // ✅ Include settled Advance
        )
      )
      .filter(e => {
        const entryDate = new Date(e.entry_date)
        return entryDate >= monthStart && entryDate <= monthEnd
      })
      .reduce((sum, e) => sum + e.amount, 0)

    const profit = revenue - totalExpenses
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0

    return {
      month: format(monthStart, 'MMM yyyy'),
      revenue,
      expenses: totalExpenses,
      profit,
      margin,
    }
  })
}

// Get expense breakdown by category with percentages (COGS + Opex only, NO Sales, NO Assets)
export function getExpenseBreakdown(entries: Entry[], startDate?: Date, endDate?: Date): CategoryExpense[] {
  // CRITICAL FIX for Bug B8: Only include COGS and Opex, NEVER Sales or Assets
  // Exclude ALL settlement entries to avoid double-counting
  let filtered = entries.filter(e =>
    ['COGS', 'Opex'].includes(e.category) &&
    (
      // Cash OUT ONLY if NOT a settlement entry (prevents double-counting)
      (e.entry_type === 'Cash OUT' && !e.notes?.startsWith('Settlement of')) ||
      e.entry_type === 'Credit' ||
      (e.entry_type === 'Advance' && e.settled === true)  // Include settled Advance
    )
  )

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.entry_date) <= endDate)
  }

  const categoryMap = new Map<string, number>()

  filtered.forEach(entry => {
    const existing = categoryMap.get(entry.category) || 0
    categoryMap.set(entry.category, existing + entry.amount)
  })

  const total = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0)

  return Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

// Generate insights and recommendations based on data
export function getRecommendations(entries: Entry[], startDate?: Date, endDate?: Date): string[] {
  const recommendations: string[] = []
  const metrics = getProfitMetrics(entries, startDate, endDate)

  // COGS analysis
  if (metrics.revenue > 0) {
    const cogsPercentage = (metrics.cogs / metrics.revenue) * 100
    if (cogsPercentage > 50) {
      recommendations.push(
        `Your COGS is ${cogsPercentage.toFixed(1)}% of revenue (industry avg: 40-50%). Consider optimizing your supply chain or renegotiating with suppliers.`
      )
    } else if (cogsPercentage < 30) {
      recommendations.push(
        `Your COGS is ${cogsPercentage.toFixed(1)}% of revenue, which is excellent! You have strong margins.`
      )
    }
  }

  // Operating expenses analysis
  if (metrics.revenue > 0) {
    const opexPercentage = (metrics.operatingExpenses / metrics.revenue) * 100
    if (opexPercentage > 40) {
      recommendations.push(
        `Operating expenses are ${opexPercentage.toFixed(1)}% of revenue. Look for opportunities to reduce overhead costs.`
      )
    }
  }

  // Profit margin analysis
  if (metrics.profitMargin < 0) {
    recommendations.push(
      `You're currently running at a loss. Focus on increasing revenue or reducing expenses to reach break-even.`
    )
  } else if (metrics.profitMargin < 10) {
    recommendations.push(
      `Profit margin is ${metrics.profitMargin.toFixed(1)}%, which is low. Aim for at least 10-15% for healthy business growth.`
    )
  } else if (metrics.profitMargin > 20) {
    recommendations.push(
      `Excellent profit margin of ${metrics.profitMargin.toFixed(1)}%! Your business is performing very well.`
    )
  }

  // Top expense category
  const expenseBreakdown = getExpenseBreakdown(entries, startDate, endDate)
  if (expenseBreakdown.length > 0) {
    const topExpense = expenseBreakdown[0]
    recommendations.push(
      `Top expense category: ${topExpense.category} (₹${topExpense.amount.toLocaleString('en-IN')}, ${topExpense.percentage.toFixed(1)}% of total expenses)`
    )
  }

  // Trend analysis (compare to previous period)
  const currentMonthStart = startDate || startOfMonth(new Date())
  const currentMonthEnd = endDate || endOfMonth(new Date())
  const previousMonthStart = startOfMonth(subMonths(currentMonthStart, 1))
  const previousMonthEnd = endOfMonth(subMonths(currentMonthStart, 1))

  const currentMetrics = getProfitMetrics(entries, currentMonthStart, currentMonthEnd)
  const previousMetrics = getProfitMetrics(entries, previousMonthStart, previousMonthEnd)

  if (previousMetrics.profitMargin !== 0) {
    const marginChange = currentMetrics.profitMargin - previousMetrics.profitMargin
    if (marginChange > 5) {
      recommendations.push(`Profit margin improved by ${marginChange.toFixed(1)}% this month. Great work!`)
    } else if (marginChange < -5) {
      recommendations.push(
        `Profit margin declined by ${Math.abs(marginChange).toFixed(1)}% this month. Review recent changes in pricing or costs.`
      )
    }
  }

  if (previousMetrics.operatingExpenses > 0) {
    const opexChange = ((currentMetrics.operatingExpenses - previousMetrics.operatingExpenses) / previousMetrics.operatingExpenses) * 100
    if (opexChange > 20) {
      recommendations.push(
        `Operating expenses increased by ${opexChange.toFixed(1)}% this month. Investigate the cause of this spike.`
      )
    }
  }

  return recommendations
}
