"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { type Entry } from "@/lib/entries";
import { calculateCashBalance } from "@/lib/analytics-new";
import { getProfitMetrics } from "@/lib/profit-calculations-new";

interface ProfitCashDashboardProps {
  entries: Entry[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProfitCashDashboard({ entries }: ProfitCashDashboardProps) {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all-time'>('all-time');

  // Calculate date range for filtering
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    switch (dateRange) {
      case 'this-month':
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        };
      case 'last-month':
        return {
          startDate: startOfMonth(subMonths(now, 1)),
          endDate: endOfMonth(subMonths(now, 1))
        };
      case 'this-year':
        return {
          startDate: new Date(currentYear, 0, 1),
          endDate: now
        };
      case 'last-year':
        return {
          startDate: new Date(currentYear - 1, 0, 1),
          endDate: new Date(currentYear - 1, 11, 31)
        };
      case 'all-time':
        return {
          startDate: undefined,
          endDate: undefined
        };
      default:
        return {
          startDate: undefined,
          endDate: undefined
        };
    }
  }, [dateRange]);

  // Filter entries by date range
  const filteredEntries = useMemo(() => {
    if (!startDate || !endDate) return entries;

    return entries.filter(entry => {
      const entryDate = new Date(entry.entry_date);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [entries, startDate, endDate]);

  const dashboardData = useMemo(() => {
    // Use EXACT calculation logic from Cash Pulse and Profit Lens
    // CASH: Uses all-time data (not filtered by period)
    const cash = calculateCashBalance(entries);

    // PROFIT: Uses getProfitMetrics with date filtering
    const profitMetrics = getProfitMetrics(filteredEntries, startDate, endDate);
    const profit = profitMetrics.netProfit;

    // WHAT YOU OWN
    const pendingCollections = entries
      .filter(e =>
        e.entry_type === 'Credit' &&
        e.category === 'Sales' &&
        !e.settled
      )
      .reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0);

    const advanceReceived = entries
      .filter(e =>
        e.entry_type === 'Advance' &&
        e.category === 'Sales' &&
        !e.settled
      )
      .reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0);

    // WHAT YOU OWE
    const pendingBills = entries
      .filter(e =>
        e.entry_type === 'Credit' &&
        ['COGS', 'Opex'].includes(e.category) &&
        !e.settled
      )
      .reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0);

    const advancePaid = entries
      .filter(e =>
        e.entry_type === 'Advance' &&
        ['COGS', 'Opex'].includes(e.category) &&
        !e.settled
      )
      .reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0);

    const assetsPurchased = entries
      .filter(e => e.category === 'Assets')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      profit,
      cash,
      whatYouOwn: {
        pendingCollections,
        advanceReceived,
      },
      whatYouOwe: {
        pendingBills,
        advancePaid,
        assetsPurchased,
      },
    };
  }, [entries, filteredEntries, startDate, endDate]);

  const difference = dashboardData.cash - dashboardData.profit;
  const totalOwn = dashboardData.whatYouOwn.pendingCollections +
                   dashboardData.whatYouOwn.advanceReceived;
  const totalOwe = dashboardData.whatYouOwe.pendingBills +
                   dashboardData.whatYouOwe.advancePaid +
                   dashboardData.whatYouOwe.assetsPurchased;

  return (
    <div className="space-y-6">
      {/* Header with Period Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Your Business Today</h1>
          <p className="text-sm text-gray-400 mt-1">Understanding your profit and cash</p>
        </div>

        {/* Period Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all-time')}
            className="px-3 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
            <option value="last-year">Last Year</option>
            <option value="all-time">All Time</option>
          </select>
        </div>
      </div>

      {/* Profit vs Cash Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cash Card */}
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/30 rounded-xl p-4">
          <div className="text-xs sm:text-sm text-gray-400 mb-1">💰 CASH</div>
          <div className="text-2xl sm:text-3xl font-bold text-green-400">
            {formatCurrency(dashboardData.cash)}
          </div>
          <div className="text-xs text-gray-500 mt-1">What you have</div>
        </div>

        {/* Profit Card */}
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/30 border border-purple-500/30 rounded-xl p-4">
          <div className="text-xs sm:text-sm text-gray-400 mb-1">📊 PROFIT</div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-400">
            {formatCurrency(dashboardData.profit)}
          </div>
          <div className="text-xs text-gray-500 mt-1">What you earned</div>
        </div>
      </div>

      {/* Difference Indicator */}
      {difference !== 0 && (
        <div className={`p-3 rounded-lg border ${
          difference > 0
            ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400'
            : 'bg-orange-900/20 border-orange-500/30 text-orange-400'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            <span>✨</span>
            <span>
              Difference: {formatCurrency(Math.abs(difference))}
              {difference > 0 ? ' more cash' : ' less cash'} than profit
            </span>
          </div>
        </div>
      )}

      {/* Explanation Section */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">💡 Why they're different</h2>

        {/* What You Own */}
        <div>
          <h3 className="text-sm font-medium text-green-400 mb-2">✅ WHAT YOU OWN</h3>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/analytics/cashpulse')}
              className="w-full flex justify-between items-center p-3 bg-green-900/20 hover:bg-green-900/30 border border-green-500/20 rounded-lg transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-white">💵 Customers owe you</div>
                <div className="text-xs text-gray-400">Pending collections</div>
              </div>
              <div className="text-base font-bold text-green-400">
                +{formatCurrency(dashboardData.whatYouOwn.pendingCollections)}
              </div>
            </button>

            <button
              onClick={() => router.push('/analytics/cashpulse')}
              className="w-full flex justify-between items-center p-3 bg-green-900/20 hover:bg-green-900/30 border border-green-500/20 rounded-lg transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-white">🎁 Advance received</div>
                <div className="text-xs text-gray-400">You have the cash</div>
              </div>
              <div className="text-base font-bold text-green-400">
                +{formatCurrency(dashboardData.whatYouOwn.advanceReceived)}
              </div>
            </button>
          </div>
          {totalOwn > 0 && (
            <div className="mt-2 text-right text-sm font-semibold text-green-400">
              Total: +{formatCurrency(totalOwn)}
            </div>
          )}
        </div>

        {/* What You Owe */}
        <div>
          <h3 className="text-sm font-medium text-red-400 mb-2">❌ WHAT YOU OWE</h3>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/analytics/cashpulse')}
              className="w-full flex justify-between items-center p-3 bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 rounded-lg transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-white">📋 You owe suppliers</div>
                <div className="text-xs text-gray-400">Pending bills</div>
              </div>
              <div className="text-base font-bold text-red-400">
                -{formatCurrency(dashboardData.whatYouOwe.pendingBills)}
              </div>
            </button>

            <button
              onClick={() => router.push('/analytics/cashpulse')}
              className="w-full flex justify-between items-center p-3 bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 rounded-lg transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-white">💸 Advance paid</div>
                <div className="text-xs text-gray-400">Cash already out</div>
              </div>
              <div className="text-base font-bold text-red-400">
                -{formatCurrency(dashboardData.whatYouOwe.advancePaid)}
              </div>
            </button>

            <button
              onClick={() => router.push('/entries')}
              className="w-full flex justify-between items-center p-3 bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 rounded-lg transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-white">🏢 Money in assets</div>
                <div className="text-xs text-gray-400">Cash tied up</div>
              </div>
              <div className="text-base font-bold text-red-400">
                -{formatCurrency(dashboardData.whatYouOwe.assetsPurchased)}
              </div>
            </button>
          </div>
          {totalOwe > 0 && (
            <div className="mt-2 text-right text-sm font-semibold text-red-400">
              Total: -{formatCurrency(totalOwe)}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/analytics/cashpulse')}
          className="py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-sm transition-colors text-white"
        >
          Collect Payments
        </button>
        <button
          onClick={() => router.push('/analytics/cashpulse')}
          className="py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-sm transition-colors text-white"
        >
          Pay Bills
        </button>
      </div>
    </div>
  );
}
