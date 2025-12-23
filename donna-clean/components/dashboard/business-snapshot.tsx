"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type Entry } from "@/lib/entries";
import { calculateCashBalance } from "@/lib/analytics-new";
import { getProfitMetrics } from "@/lib/profit-calculations-new";
import { PeriodFilter, getDateRangeForPeriod, type PeriodType } from "@/components/common/period-filter";

interface BusinessSnapshotProps {
  entries: Entry[];
}

export function BusinessSnapshot({ entries }: BusinessSnapshotProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodType>("all-time");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [expandedOwn, setExpandedOwn] = useState(false);
  const [expandedOwe, setExpandedOwe] = useState(false);

  const snapshotData = useMemo(() => {
    const { start, end } = getDateRangeForPeriod(period, selectedYear);

    // Filter entries for the selected period (for profit calculation)
    const filteredEntries = start && end
      ? entries.filter(e => {
          const entryDate = new Date(e.entry_date);
          return entryDate >= start && entryDate <= end;
        })
      : entries;

    // WHAT YOU OWN (Assets)
    // 1. Cash - always all-time from Cash Pulse logic
    const cash = calculateCashBalance(entries);

    // 2. Receivables - pending collections (Credit Sales not settled)
    const receivables = entries
      .filter(e => e.entry_type === 'Credit' && e.category === 'Sales' && !e.settled)
      .reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0);

    // 3. Prepaid - advances paid to suppliers (Advance COGS/Opex/Assets not settled)
    const prepaid = entries
      .filter(e => e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category) && !e.settled)
      .reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0);

    // 4. Fixed Assets - total of all asset entries
    const fixedAssets = entries
      .filter(e => e.category === 'Assets')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalOwn = cash + receivables + prepaid + fixedAssets;

    // WHAT YOU OWE (Liabilities)
    // 1. Credit Bills - goods/services received on credit (Credit COGS/Opex not settled)
    const creditBills = entries
      .filter(e => e.entry_type === 'Credit' && ['COGS', 'Opex'].includes(e.category) && !e.settled)
      .reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0);

    // 2. Customer Advances - advances received from customers (Advance Sales not settled)
    const customerAdvances = entries
      .filter(e => e.entry_type === 'Advance' && e.category === 'Sales' && !e.settled)
      .reduce((sum, e) => sum + (e.remaining_amount ?? e.amount), 0);

    const totalOwe = creditBills + customerAdvances;

    // PROFIT - for selected period using Profit Lens logic
    const profitMetrics = getProfitMetrics(
      filteredEntries,
      start ?? undefined,
      end ?? undefined
    );
    const profit = profitMetrics.netProfit;

    return {
      cash,
      receivables,
      prepaid,
      fixedAssets,
      totalOwn,
      creditBills,
      customerAdvances,
      totalOwe,
      profit
    };
  }, [entries, period, selectedYear]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">How is your Business doing?</h1>
      </div>

      {/* Period Filter */}
      <div>
        <PeriodFilter
          value={period}
          onChange={setPeriod}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      </div>

      {/* What You Own - HERO CARD (LARGEST) */}
      <div className="bg-gradient-to-br from-[#2d1b4e] to-[#1e1538] border-2 border-purple-500 p-8 md:p-10 rounded-2xl shadow-lg shadow-purple-500/30 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-[-50%] right-[-20%] w-64 h-64 bg-purple-500/15 rounded-full" />

        <div className="relative z-10">
          <div className="text-xs uppercase tracking-widest opacity-60 font-bold mb-4">
            💰 WHAT'S YOURS?
          </div>
          <div className="text-5xl md:text-6xl lg:text-7xl font-black mb-2 text-white">
            ₹{snapshotData.cash.toLocaleString('en-IN')}
          </div>
          <div className="text-sm opacity-50 font-medium">
            Your total cash balance
          </div>
        </div>
      </div>

      {/* What You Owe + Total Profit - Side by side (SMALLER) */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {/* What You Owe */}
        <div className="bg-gradient-to-br from-[#2d1b4e] to-[#1e1538] border border-purple-500/30 border-l-4 border-l-red-500 p-4 rounded-xl">
          <div className={`text-xs uppercase tracking-wide font-semibold mb-3 ${snapshotData.totalOwe === 0 ? 'opacity-50' : 'opacity-70'}`}>
            What is NOT yours?
          </div>
          <div className={`text-2xl md:text-3xl font-bold text-white ${snapshotData.totalOwe === 0 ? 'opacity-30' : ''}`}>
            ₹{snapshotData.totalOwe.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-gradient-to-br from-[#2d1b4e] to-[#1e1538] border border-purple-500/30 border-l-4 border-l-purple-500 p-4 rounded-xl">
          <div className="text-xs uppercase tracking-wide opacity-50 font-semibold mb-3">
            Your Profit from Sales
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white">
            ₹{snapshotData.profit.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Expandable Details Section */}
      <div className="space-y-3">
        {/* What You Own Details (Collapsible) */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedOwn(!expandedOwn)}
            className="w-full p-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
          >
            <div className="text-sm text-white font-medium">💰 What's Yours?</div>
            {expandedOwn ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedOwn && (
            <div className="px-3 pb-3 space-y-2 border-t border-gray-700">
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-gray-400">Cash in Bank/Hand</span>
                <span className="text-sm font-semibold text-white">
                  ₹{snapshotData.cash.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Money to Collect</span>
                <span className="text-sm font-semibold text-white">
                  ₹{snapshotData.receivables.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Advances Paid</span>
                <span className="text-sm font-semibold text-white">
                  ₹{snapshotData.prepaid.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Fixed Assets</span>
                <span className="text-sm font-semibold text-white">
                  ₹{snapshotData.fixedAssets.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* What You Owe Details (Collapsible) */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedOwe(!expandedOwe)}
            className="w-full p-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
          >
            <div className="text-sm text-white font-medium">📋 What's left to pay?</div>
            {expandedOwe ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedOwe && (
            <div className="px-3 pb-3 space-y-2 border-t border-gray-700">
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-gray-400">Bills to Pay</span>
                <span className="text-sm font-semibold text-white">
                  ₹{snapshotData.creditBills.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Customer Advances</span>
                <span className="text-sm font-semibold text-white">
                  ₹{snapshotData.customerAdvances.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/analytics/cashpulse')}
          className="py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-sm transition-colors text-white"
        >
          💰 View Cash Pulse
        </button>
        <button
          onClick={() => router.push('/analytics/profitlens')}
          className="py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-sm transition-colors text-white"
        >
          📊 View Profit Lens
        </button>
      </div>
    </div>
  );
}
