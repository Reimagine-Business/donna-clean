import { createSupabaseServerClient } from "@/utils/supabase/server"
import { type AlertType } from "@/app/notifications/actions"

export type CreateAlertInput = {
  userId: string
  title: string
  message: string
  type: AlertType
  priority: number
  relatedEntityType?: string
  relatedEntityId?: string
}

// Create a new alert
export async function createAlert(input: CreateAlertInput) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('alerts')
    .insert({
      user_id: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      priority: input.priority,
      related_entity_type: input.relatedEntityType || null,
      related_entity_id: input.relatedEntityId || null,
    })

  if (error) {
    console.error('Failed to create alert:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

// Create low balance alert
export async function createLowBalanceAlert(userId: string, balance: number) {
  if (balance >= 10000) {
    return // Don't create alert if balance is healthy
  }

  const type: AlertType = balance < 0 ? 'critical' : balance < 5000 ? 'warning' : 'info'
  const priority = balance < 0 ? 2 : balance < 5000 ? 1 : 0

  return createAlert({
    userId,
    title: balance < 0 ? 'Negative Cash Balance!' : 'Low Cash Balance',
    message: balance < 0
      ? `URGENT: Your cash balance is negative: ₹${Math.abs(balance).toLocaleString('en-IN')}. Immediate action required.`
      : `Your cash balance is low: ₹${balance.toLocaleString('en-IN')}. Consider managing cash flow.`,
    type,
    priority,
  })
}

// Create high expense alert
export async function createHighExpenseAlert(userId: string, amount: number, category: string, entryId?: string) {
  if (amount < 50000) {
    return // Only alert for expenses >= ₹50,000
  }

  return createAlert({
    userId,
    title: 'Large Expense Recorded',
    message: `A large expense of ₹${amount.toLocaleString('en-IN')} was recorded in ${category}. Please review if this is correct.`,
    type: 'warning',
    priority: 1,
    relatedEntityType: entryId ? 'entry' : undefined,
    relatedEntityId: entryId,
  })
}

// Create monthly summary alert
export async function createMonthlySummaryAlert(userId: string, income: number, expenses: number, month: string) {
  const netProfit = income - expenses
  const type: AlertType = netProfit < 0 ? 'warning' : 'info'
  const priority = netProfit < 0 ? 1 : 0

  return createAlert({
    userId,
    title: `Monthly Summary - ${month}`,
    message: `Income: ₹${income.toLocaleString('en-IN')} | Expenses: ₹${expenses.toLocaleString('en-IN')} | Net: ₹${netProfit.toLocaleString('en-IN')}${netProfit < 0 ? ' (Loss)' : ' (Profit)'}`,
    type,
    priority,
  })
}

// Create budget exceeded alert
export async function createBudgetExceededAlert(
  userId: string,
  category: string,
  spent: number,
  budget: number
) {
  if (spent <= budget) {
    return // Don't create alert if within budget
  }

  const percentOver = ((spent - budget) / budget) * 100

  return createAlert({
    userId,
    title: 'Budget Exceeded',
    message: `You've exceeded your ${category} budget by ${percentOver.toFixed(0)}%. Spent: ₹${spent.toLocaleString('en-IN')} / Budget: ₹${budget.toLocaleString('en-IN')}`,
    type: percentOver > 50 ? 'critical' : 'warning',
    priority: percentOver > 50 ? 2 : 1,
  })
}

// Create expense vs income alert
export async function createExpenseVsIncomeAlert(userId: string, income: number, expenses: number) {
  if (expenses <= income) {
    return // Only alert if expenses exceed income
  }

  const difference = expenses - income

  return createAlert({
    userId,
    title: 'Expenses Exceed Income',
    message: `Your expenses (₹${expenses.toLocaleString('en-IN')}) exceed your income (₹${income.toLocaleString('en-IN')}) by ₹${difference.toLocaleString('en-IN')} this month.`,
    type: 'warning',
    priority: 1,
  })
}

// Create profit margin alert
export async function createProfitMarginAlert(userId: string, revenue: number, profit: number) {
  if (revenue === 0) return

  const margin = (profit / revenue) * 100

  if (margin >= 10) return // Only alert if margin is low

  const type: AlertType = margin < 0 ? 'critical' : margin < 5 ? 'warning' : 'info'
  const priority = margin < 0 ? 2 : margin < 5 ? 1 : 0

  return createAlert({
    userId,
    title: margin < 0 ? 'Operating at a Loss' : 'Low Profit Margin',
    message: margin < 0
      ? `You're operating at a ${Math.abs(margin).toFixed(1)}% loss. Revenue: ₹${revenue.toLocaleString('en-IN')}, Loss: ₹${Math.abs(profit).toLocaleString('en-IN')}`
      : `Your profit margin is only ${margin.toFixed(1)}%. Consider ways to increase revenue or reduce expenses.`,
    type,
    priority,
  })
}

// Create COGS alert (if too high)
export async function createCOGSAlert(userId: string, revenue: number, cogs: number) {
  if (revenue === 0) return

  const cogsPercentage = (cogs / revenue) * 100

  if (cogsPercentage <= 50) return // Only alert if COGS > 50% of revenue

  return createAlert({
    userId,
    title: 'High Cost of Goods Sold',
    message: `Your COGS is ${cogsPercentage.toFixed(1)}% of revenue (industry avg: 40-50%). Consider optimizing your supply chain or renegotiating with suppliers.`,
    type: 'warning',
    priority: 1,
  })
}

// Cleanup old read alerts (helper function)
export async function cleanupOldReadAlerts(userId: string, daysToKeep: number = 30) {
  const supabase = await createSupabaseServerClient()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('user_id', userId)
    .eq('is_read', true)
    .lt('read_at', cutoffDate.toISOString())

  if (error) {
    console.error('Failed to cleanup old alerts:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}
