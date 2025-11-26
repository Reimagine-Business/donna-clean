import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { ProfitLensShell } from "@/components/profit-lens/profit-lens-shell";
import { SessionExpiredNotice } from "@/components/session-expired-notice";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { createSupabaseServerClient } from "@/utils/supabase/server";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

export default async function ProfitLensPage() {
  const supabase = await createSupabaseServerClient();
  const { user, initialError } = await getOrRefreshUser(supabase);

  if (!user) {
    console.error(
      `[Auth Fail] No user in profit-lens/page${
        initialError ? ` – error: ${initialError.message}` : ""
      }`,
      initialError ?? undefined,
    );
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0f1e]">
        <div className="text-purple-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f1e] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900 to-purple-800 px-4 py-6 md:px-6 md:py-8">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-4">📊 Profit Lens</h1>
        
        {/* Date Filter Dropdown */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className="w-full md:w-auto px-3 py-2 bg-purple-800/50 text-white text-sm md:text-base rounded-lg border border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_year">This Year</option>
          <option value="last_year">Last Year</option>
          <option value="all_time">All Time</option>
        </select>
        
        <div className="text-purple-200 text-xs md:text-sm mt-2">
          P&L Statement: {getDateRangeLabel()}
        </div>
      </div>

      {/* P&L Summary */}
      <div className="px-4 py-6 md:px-6 space-y-3">
        {/* Revenue */}
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-xl p-4 border border-green-700/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-green-300 text-xs md:text-sm font-medium">Total Revenue</p>
              <p className="text-white text-xl md:text-2xl font-bold mt-1">
                ₹{revenue.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-2xl md:text-3xl">💰</div>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-xl p-4 border border-red-700/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-red-300 text-xs md:text-sm font-medium">Total Expenses</p>
              <p className="text-white text-xl md:text-2xl font-bold mt-1">
                ₹{expenses.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-2xl md:text-3xl">💸</div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className={`bg-gradient-to-br ${
          grossProfit >= 0 
            ? 'from-purple-900/40 to-purple-800/30 border-purple-700/40' 
            : 'from-red-900/40 to-red-800/30 border-red-700/40'
        } rounded-xl p-4 border`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <p className={`${grossProfit >= 0 ? 'text-purple-300' : 'text-red-300'} text-xs md:text-sm font-medium`}>
                Gross Profit
              </p>
              <p className="text-white text-xl md:text-2xl font-bold mt-1">
                ₹{grossProfit.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-2xl md:text-3xl">
              {grossProfit >= 0 ? '✅' : '⚠️'}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-700/30">
            <span className="text-purple-400 text-[10px] md:text-xs">Gross Margin</span>
            <span className={`text-xs md:text-sm font-semibold ${grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {grossMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`bg-gradient-to-br ${
          netProfit >= 0 
            ? 'from-purple-900/40 to-purple-800/30 border-purple-700/40' 
            : 'from-red-900/40 to-red-800/30 border-red-700/40'
        } rounded-xl p-4 border`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <p className={`${netProfit >= 0 ? 'text-purple-300' : 'text-red-300'} text-xs md:text-sm font-medium`}>
                Net Profit
              </p>
              <p className="text-white text-xl md:text-2xl font-bold mt-1">
                ₹{netProfit.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-2xl md:text-3xl">
              {netProfit >= 0 ? '🎯' : '📉'}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-700/30">
            <span className="text-purple-400 text-[10px] md:text-xs">Net Margin</span>
            <span className={`text-xs md:text-sm font-semibold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

  return (
    <main className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <div className="flex flex-col gap-10">
        <SiteHeader />
        <TopNavMobile pageTitle="Profit Lens" userEmail={user.email || undefined} />
        <section className="px-4 pb-12 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <ProfitLensShell initialEntries={entries || []} userId={user.id} />
          </div>
        </section>
      </div>
    </div>
  )
}
