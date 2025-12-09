"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type Entry } from "@/app/entries/actions";
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Business Snapshot</h1>
        <p className="text-sm text-gray-400 mt-1">Quick overview of your finances</p>
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

      {/* What You Own (Assets) */}
      <div className="bg-green-900/20 border border-green-500/30 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandedOwn(!expandedOwn)}
          className="w-full p-4 flex items-center justify-between hover:bg-green-900/10 transition-colors"
        >
          <div className="text-left">
            <div className="text-sm text-white mb-1">💰 WHAT YOU OWN</div>
            <div className="text-3xl font-bold text-green-400">
              ₹{snapshotData.totalOwn.toLocaleString('en-IN')}
            </div>
          </div>
          {expandedOwn ? (
            <ChevronUp className="w-5 h-5 text-green-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-green-400" />
          )}
        </button>

        {expandedOwn && (
          <div className="px-4 pb-4 space-y-3 border-t border-green-500/20">
            <div className="flex justify-between items-center pt-3">
              <span className="text-sm text-gray-300">Cash in Bank/Hand</span>
              <span className="text-lg font-semibold text-green-400">
                ₹{snapshotData.cash.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Money to Collect (Receivables)</span>
              <span className="text-lg font-semibold text-green-400">
                ₹{snapshotData.receivables.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Advances Paid (Prepaid)</span>
              <span className="text-lg font-semibold text-green-400">
                ₹{snapshotData.prepaid.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Fixed Assets</span>
              <span className="text-lg font-semibold text-green-400">
                ₹{snapshotData.fixedAssets.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* What You Owe (Liabilities) */}
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandedOwe(!expandedOwe)}
          className="w-full p-4 flex items-center justify-between hover:bg-red-900/10 transition-colors"
        >
          <div className="text-left">
            <div className="text-sm text-white mb-1">📋 WHAT YOU OWE</div>
            <div className="text-3xl font-bold text-red-400">
              ₹{snapshotData.totalOwe.toLocaleString('en-IN')}
            </div>
          </div>
          {expandedOwe ? (
            <ChevronUp className="w-5 h-5 text-red-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-red-400" />
          )}
        </button>

        {expandedOwe && (
          <div className="px-4 pb-4 space-y-3 border-t border-red-500/20">
            <div className="flex justify-between items-center pt-3">
              <span className="text-sm text-gray-300">Bills to Pay (Credit)</span>
              <span className="text-lg font-semibold text-red-400">
                ₹{snapshotData.creditBills.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Customer Advances</span>
              <span className="text-lg font-semibold text-red-400">
                ₹{snapshotData.customerAdvances.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Total Profit */}
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
        <div className="text-sm text-white mb-1">
          📊 TOTAL PROFIT ({period === "all-time" ? "All Time" : selectedYear})
        </div>
        <div className={`text-3xl font-bold ${snapshotData.profit >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
          ₹{snapshotData.profit.toLocaleString('en-IN')}
        </div>
        <div className="text-xs text-gray-500 mt-1">What you earned in selected period</div>

        {period !== "all-time" && (
          <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-200">
            ℹ️ Assets & Liabilities show current balances. Profit shows {selectedYear} earnings only.
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/analytics/cashpulse')}
          className="py-3 px-4 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-sm transition-colors text-white"
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
