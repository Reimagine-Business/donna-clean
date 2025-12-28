"use client";

import { useMemo } from "react";
import type { Entry } from "@/lib/entries";
import type { LucideIcon } from "lucide-react";
import { DonnaIcon } from "@/components/common/donna-icon";
import { DonnaIcons } from "@/lib/icon-mappings";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  category: string;
}

interface BusinessInsightsProps {
  entries: Entry[];
  reminders?: Reminder[];
}

interface NewsItem {
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  message: string;
  priority: number; // 1=critical, 2=warning, 3=info, 4=success
}

export function BusinessInsights({ entries, reminders = [] }: BusinessInsightsProps) {
  const newsItems = useMemo(() => {
    const items: NewsItem[] = [];
    const today = new Date().toISOString().split('T')[0];

    const fmt = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

    // Process Reminders - HIGHEST PRIORITY
    const pendingReminders = reminders.filter(r => r.status === 'pending');

    // 1. Overdue reminders (CRITICAL)
    const overdueReminders = pendingReminders.filter(r => r.due_date < today);
    if (overdueReminders.length > 0) {
      const daysOverdue = Math.ceil((new Date().getTime() - new Date(overdueReminders[0].due_date).getTime()) / (1000 * 60 * 60 * 24));
      items.push({
        icon: DonnaIcons.alertTriangle,
        variant: 'danger',
        message: overdueReminders.length === 1
          ? `Overdue: ${overdueReminders[0].title}`
          : `${overdueReminders.length} overdue reminders (${daysOverdue}+ days)`,
        priority: 1
      });
    }

    // 2. Reminders due within a week (WARNING)
    const oneWeekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const upcomingReminders = pendingReminders.filter(r =>
      r.due_date >= today && r.due_date <= oneWeekFromNow
    );
    if (upcomingReminders.length > 0) {
      const daysUntil = Math.ceil((new Date(upcomingReminders[0].due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const when = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
      items.push({
        icon: DonnaIcons.clock,
        variant: 'warning',
        message: upcomingReminders.length === 1
          ? `Reminder due ${when}: ${upcomingReminders[0].title}`
          : `${upcomingReminders.length} reminders due ${when}`,
        priority: 2
      });
    }

    // Calculate cash balance
    const allCashEntries = entries.filter(e =>
      e.entry_type === 'Cash IN' || e.entry_type === 'Cash OUT'
    );
    const cashBalance = allCashEntries.reduce((sum, e) => {
      return e.entry_type === 'Cash IN'
        ? sum + (e.amount || 0)
        : sum - (e.amount || 0);
    }, 0);

    // 1. CRITICAL: Very low cash
    if (cashBalance < 1000 && cashBalance > 0) {
      items.push({
        icon: DonnaIcons.alertTriangle,
        variant: 'danger',
        message: `Critical: Cash balance ${fmt(cashBalance)}`,
        priority: 1
      });
    }
    // 2. WARNING: Low cash
    else if (cashBalance < 5000 && cashBalance > 0) {
      items.push({
        icon: DonnaIcons.cashOut,
        variant: 'warning',
        message: `Low cash: ${fmt(cashBalance)} (below ₹5,000)`,
        priority: 2
      });
    }
    // 3. GOOD: Healthy cash
    else if (cashBalance >= 10000) {
      items.push({
        icon: DonnaIcons.totalCashBalance,
        variant: 'success',
        message: `Cash balance is healthy: ${fmt(cashBalance)}`,
        priority: 4
      });
    }
    // 4. OK: Good cash
    else if (cashBalance >= 5000) {
      items.push({
        icon: DonnaIcons.totalCashBalance,
        variant: 'success',
        message: `Cash balance is good: ${fmt(cashBalance)}`,
        priority: 4
      });
    }

    // Calculate today's cash IN
    const todayCashIn = entries
      .filter(e => e.entry_type === 'Cash IN' && e.entry_date === today)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    if (todayCashIn >= 5000) {
      items.push({
        icon: DonnaIcons.cashIn,
        variant: 'success',
        message: `Strong cash inflow today: ${fmt(todayCashIn)}`,
        priority: 4
      });
    }

    // Yesterday for comparison
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yesterdayCashIn = entries
      .filter(e => e.entry_type === 'Cash IN' && e.entry_date === yesterday)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // 5. Cash IN trend
    if (todayCashIn > 0 && yesterdayCashIn > 0) {
      const change = ((todayCashIn - yesterdayCashIn) / yesterdayCashIn) * 100;
      if (change > 25) {
        items.push({
          icon: DonnaIcons.cashIn,
          variant: 'success',
          message: `Cash IN up ${Math.round(change)}% vs yesterday`,
          priority: 4
        });
      } else if (change < -25) {
        items.push({
          icon: DonnaIcons.cashOut,
          variant: 'danger',
          message: `Cash IN down ${Math.abs(Math.round(change))}% vs yesterday`,
          priority: 2
        });
      }
    }

    // 6. CRITICAL: Overdue bills
    const overdueBills = entries.filter(e =>
      e.entry_type === 'Credit' &&
      e.category !== 'Sales' &&
      !e.settled &&
      e.entry_date < today
    );
    if (overdueBills.length > 0) {
      const total = overdueBills.reduce((sum, e) =>
        sum + (e.remaining_amount || e.amount || 0), 0
      );
      items.push({
        icon: DonnaIcons.billsDue,
        variant: 'danger',
        message: `${overdueBills.length} overdue bill${overdueBills.length > 1 ? 's' : ''}: ${fmt(total)}`,
        priority: 1
      });
    }

    // 7. WARNING: Bills due soon
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const billsDueSoon = entries.filter(e =>
      e.entry_type === 'Credit' &&
      e.category !== 'Sales' &&
      !e.settled &&
      e.entry_date >= today &&
      e.entry_date <= tomorrow
    );
    if (billsDueSoon.length > 0) {
      const total = billsDueSoon.reduce((sum, e) =>
        sum + (e.remaining_amount || e.amount || 0), 0
      );
      const when = billsDueSoon[0].entry_date === today ? 'today' : 'tomorrow';
      items.push({
        icon: DonnaIcons.billsDue,
        variant: 'warning',
        message: `${billsDueSoon.length} bill${billsDueSoon.length > 1 ? 's' : ''} due ${when}: ${fmt(total)}`,
        priority: 2
      });
    }

    // 8. Pending collections
    const pendingCollections = entries.filter(e =>
      e.entry_type === 'Credit' &&
      e.category === 'Sales' &&
      !e.settled &&
      (e.remaining_amount || e.amount) > 0
    );
    if (pendingCollections.length > 0) {
      const total = pendingCollections.reduce((sum, e) =>
        sum + (e.remaining_amount || e.amount || 0), 0
      );
      items.push({
        icon: DonnaIcons.pendingCollection,
        variant: 'warning',
        message: `${pendingCollections.length} pending collection${pendingCollections.length > 1 ? 's' : ''}: ${fmt(total)}`,
        priority: 3
      });
    }

    // 9. Recent settlements (last 7 days) - SUCCESS
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const recentSettlements = entries.filter(e =>
      e.is_settlement === true &&
      e.entry_date >= lastWeek
    );
    if (recentSettlements.length > 0) {
      const total = recentSettlements.reduce((sum, e) =>
        sum + (e.amount || 0), 0
      );
      items.push({
        icon: DonnaIcons.checkCircle,
        variant: 'success',
        message: `${recentSettlements.length} settlement${recentSettlements.length > 1 ? 's' : ''} completed this week: ${fmt(total)}`,
        priority: 4
      });
    }

    // Sort by priority and return top 3 for mobile compactness
    return items
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);
  }, [entries, reminders]);

  // Hide if no news
  if (newsItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border-2 border-gray-200 bg-white p-3 shadow-sm">
      <h2 className="text-sm font-semibold mb-2 text-gray-900 flex items-center gap-2">
        <DonnaIcon icon={DonnaIcons.alerts} size="xs" />
        <span>Today's News</span>
      </h2>

      <ul className="space-y-2">
        {newsItems.map((item, idx) => (
          <li
            key={idx}
            className="flex items-center justify-between gap-3 p-2 rounded-md bg-purple-500/5 hover:bg-purple-500/10 transition-all duration-200 hover:translate-x-1"
          >
            <span className="text-xs flex-1 leading-relaxed text-gray-700">{item.message}</span>
            <DonnaIcon icon={item.icon} size="sm" variant={item.variant} className="flex-shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
