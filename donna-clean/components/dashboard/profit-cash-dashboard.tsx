"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { type Entry } from "@/app/entries/actions";

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

  const dashboardData = useMemo(() => {
    // PROFIT CALCULATION (from Profit Lens logic)
    const sales = entries
      .filter(e => e.category === 'Sales' && e.entry_type !== 'Advance')
      .reduce((sum, e) => sum + e.amount, 0);

    const expenses = entries
      .filter(e => ['COGS', 'Opex'].includes(e.category) && e.entry_type !== 'Advance')
      .reduce((sum, e) => sum + e.amount, 0);

    const profit = sales - expenses;

    // CASH CALCULATION (from Cash Pulse logic)
    const cashIn = entries
      .filter(e => e.entry_type === 'Cash IN' || (e.entry_type === 'Advance' && e.category === 'Sales'))
      .reduce((sum, e) => sum + e.amount, 0);

    const cashOut = entries
      .filter(e => e.entry_type === 'Cash OUT' || (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category)))
      .reduce((sum, e) => sum + e.amount, 0);

    const cash = cashIn - cashOut;

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
  }, [entries]);

  const difference = dashboardData.cash - dashboardData.profit;
  const totalOwn = dashboardData.whatYouOwn.pendingCollections +
                   dashboardData.whatYouOwn.advanceReceived;
  const totalOwe = dashboardData.whatYouOwe.pendingBills +
                   dashboardData.whatYouOwe.advancePaid +
                   dashboardData.whatYouOwe.assetsPurchased;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Your Business Today</h1>
        <p className="text-sm text-gray-400 mt-1">Understanding your profit and cash</p>
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
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30 rounded-xl p-4">
          <div className="text-xs sm:text-sm text-gray-400 mb-1">📊 PROFIT</div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-400">
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
