"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type Entry } from "@/app/entries/actions";
import { calculateCashBalance } from "@/lib/analytics-new";
import { getProfitMetrics } from "@/lib/profit-calculations-new";
import { calculateHealthScore } from "@/lib/calculate-health-score";
import { LearnCashProfitModal } from "./learn-cash-profit-modal";

interface FinancialHealthDashboardProps {
  entries: Entry[];
}

export function FinancialHealthDashboard({ entries }: FinancialHealthDashboardProps) {
  const router = useRouter();
  const [showLearnModal, setShowLearnModal] = useState(false);

  const dashboardData = useMemo(() => {
    // Calculate cash (same logic as Cash Pulse - all-time)
    const cash = calculateCashBalance(entries);

    // Calculate profit (same logic as Profit Lens - all-time for health score)
    const profitMetrics = getProfitMetrics(entries);
    const profit = profitMetrics.netProfit;
    const sales = profitMetrics.revenue;

    // Pending collections
    const pendingCollections = entries
      .filter(e => e.entry_type === 'Credit' && e.category === 'Sales' && !e.settled)
      .reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0);

    // Pending bills
    const pendingBills = entries
      .filter(e => e.entry_type === 'Credit' && ['COGS', 'Opex'].includes(e.category) && !e.settled)
      .reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0);

    // Calculate oldest collection/bill days
    const now = new Date();
    const collectionEntries = entries.filter(e =>
      e.entry_type === 'Credit' && e.category === 'Sales' && !e.settled
    );
    const billEntries = entries.filter(e =>
      e.entry_type === 'Credit' && ['COGS', 'Opex'].includes(e.category) && !e.settled
    );

    const oldestCollectionDays = collectionEntries.length > 0
      ? Math.max(...collectionEntries.map(e =>
          Math.floor((now.getTime() - new Date(e.entry_date).getTime()) / (1000 * 60 * 60 * 24))
        ))
      : 0;

    const oldestBillDays = billEntries.length > 0
      ? Math.max(...billEntries.map(e =>
          Math.floor((now.getTime() - new Date(e.entry_date).getTime()) / (1000 * 60 * 60 * 24))
        ))
      : 0;

    const healthScore = calculateHealthScore({
      cash,
      profit,
      sales,
      pendingCollections,
      pendingBills,
      oldestCollectionDays,
      oldestBillDays
    });

    return {
      cash,
      profit,
      sales,
      pendingCollections,
      pendingBills,
      healthScore,
      collectionCount: collectionEntries.length,
      billCount: billEntries.length
    };
  }, [entries]);

  const { healthScore } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Your Financial Health</h1>
        <p className="text-sm text-gray-400 mt-1">Quick overview of your business</p>
      </div>

      {/* Health Score Card */}
      <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Overall Score</h2>
          <span className="text-2xl">{healthScore.statusEmoji}</span>
        </div>

        <div className="space-y-4">
          {/* Score Display */}
          <div className="text-center">
            <div className="text-5xl sm:text-6xl font-bold text-purple-400">
              {healthScore.totalScore}
              <span className="text-2xl text-gray-500">/100</span>
            </div>
            <p className={`text-lg font-medium mt-2 ${healthScore.statusColor}`}>
              {healthScore.status === 'excellent' && 'Excellent!'}
              {healthScore.status === 'good' && 'Good Shape'}
              {healthScore.status === 'fair' && 'Fair'}
              {healthScore.status === 'needs-attention' && 'Needs Attention'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                healthScore.totalScore >= 85 ? 'bg-green-500' :
                healthScore.totalScore >= 70 ? 'bg-blue-500' :
                healthScore.totalScore >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${healthScore.totalScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">💰 CASH</div>
          <div className="text-2xl font-bold text-green-400">
            ₹{dashboardData.cash.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-gray-500 mt-1">What you have</div>
        </div>

        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">📊 PROFIT</div>
          <div className="text-2xl font-bold text-purple-400">
            ₹{dashboardData.profit.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-gray-500 mt-1">What you earned</div>
        </div>
      </div>

      {/* Learn More Link */}
      <button
        onClick={() => setShowLearnModal(true)}
        className="w-full text-center text-sm text-purple-400 hover:text-purple-300 underline"
      >
        💡 Why are Cash and Profit different?
      </button>

      {/* Top Actions */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
        <h3 className="text-base font-semibold mb-3 text-white">⚡ TOP ACTIONS TODAY</h3>
        <div className="space-y-3">
          {dashboardData.pendingCollections > 0 && (
            <button
              onClick={() => router.push('/analytics/cashpulse')}
              className="w-full flex items-center justify-between p-3 bg-green-900/20 hover:bg-green-900/30 border border-green-500/20 rounded-lg transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-white">1. 💵 Collect payments</div>
                <div className="text-xs text-gray-400">
                  ₹{dashboardData.pendingCollections.toLocaleString('en-IN')} pending from {dashboardData.collectionCount} customer{dashboardData.collectionCount !== 1 ? 's' : ''}
                </div>
              </div>
              <span className="text-green-400">→</span>
            </button>
          )}

          {dashboardData.pendingBills > 0 && (
            <button
              onClick={() => router.push('/analytics/cashpulse')}
              className="w-full flex items-center justify-between p-3 bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 rounded-lg transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-white">
                  {dashboardData.pendingCollections > 0 ? '2' : '1'}. 📋 Pay bills
                </div>
                <div className="text-xs text-gray-400">
                  ₹{dashboardData.pendingBills.toLocaleString('en-IN')} due to {dashboardData.billCount} supplier{dashboardData.billCount !== 1 ? 's' : ''}
                </div>
              </div>
              <span className="text-red-400">→</span>
            </button>
          )}

          <button
            onClick={() => router.push('/analytics/profitlens')}
            className="w-full flex items-center justify-between p-3 bg-purple-900/20 hover:bg-purple-900/30 border border-purple-500/20 rounded-lg transition-colors text-left"
          >
            <div>
              <div className="text-sm font-medium text-white">
                {(dashboardData.pendingCollections > 0 ? 1 : 0) + (dashboardData.pendingBills > 0 ? 1 : 0) + 1}. 📊 Review profit trend
              </div>
              <div className="text-xs text-gray-400">
                See how your business is performing
              </div>
            </div>
            <span className="text-purple-400">→</span>
          </button>
        </div>
      </div>

      {/* Quick Access Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => router.push('/entries')}
          className="py-3 px-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-sm transition-colors text-white"
        >
          ➕ New Entry
        </button>
        <button
          onClick={() => router.push('/analytics/cashpulse')}
          className="py-3 px-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-sm transition-colors text-white"
        >
          💰 Cash
        </button>
        <button
          onClick={() => router.push('/analytics/profitlens')}
          className="py-3 px-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-sm transition-colors text-white"
        >
          📊 Profit
        </button>
      </div>

      {/* Educational Modal */}
      <LearnCashProfitModal
        isOpen={showLearnModal}
        onClose={() => setShowLearnModal(false)}
        userCash={dashboardData.cash}
        userProfit={dashboardData.profit}
        pendingCollections={dashboardData.pendingCollections}
        pendingBills={dashboardData.pendingBills}
      />
    </div>
  );
}
