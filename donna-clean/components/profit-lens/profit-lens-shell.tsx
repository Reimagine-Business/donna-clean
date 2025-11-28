"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { Entry, normalizeEntry } from "@/lib/entries";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  filterByDateRange,
  filterByCustomDateRange,
  getDateRangeLabel,
  formatCustomDateLabel,
  type DateRange
} from "@/lib/date-utils";
import { formatAmountInWordsShort, formatCurrencyWithWords } from "@/lib/format-number-words";
import { showWarning } from "@/lib/toast";

type ProfitLensShellProps = {
  initialEntries: Entry[];
  userId: string;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
});

const percentageFormatter = (value: number) =>
  Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";

const currentStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
const currentEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

type FiltersState = {
  start_date: string;
  end_date: string;
};

const ENTRY_SELECT =
  "id, user_id, entry_type, category, payment_method, amount, remaining_amount, entry_date, notes, image_url, settled, settled_at, created_at, updated_at";

const MAX_REALTIME_RECONNECT_ATTEMPTS = 5;
const BASE_REALTIME_DELAY_MS = 5000;
const MAX_REALTIME_DELAY_MS = 30000;

export function ProfitLensShell({ initialEntries, userId }: ProfitLensShellProps) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<Entry[]>(initialEntries.map(normalizeEntry));
  const [filters, setFilters] = useState<FiltersState>({
    start_date: currentStart,
    end_date: currentEnd,
  });
  const [dateFilter, setDateFilter] = useState("this-month");
  const [showCustomDatePickers, setShowCustomDatePickers] = useState(false);
  const [customFromDate, setCustomFromDate] = useState<Date>();
  const [customToDate, setCustomToDate] = useState<Date>();

  const initialStatsRef = useRef<ProfitStats | null>(null);
  if (!initialStatsRef.current) {
    // Filter initial entries by default date range (this-month)
    const filteredInitial = filterByDateRange(initialEntries, "this-month" as DateRange);
    initialStatsRef.current = buildProfitStats(filteredInitial);
  }
  const initialStats = initialStatsRef.current as ProfitStats;

  const [sales, setSales] = useState(initialStats.sales);
  const [cogs, setCogs] = useState(initialStats.cogs);
  const [opex, setOpex] = useState(initialStats.opex);
  const [grossProfit, setGrossProfit] = useState(initialStats.grossProfit);
  const [netProfit, setNetProfit] = useState(initialStats.netProfit);
  const [grossMargin, setGrossMargin] = useState(initialStats.grossMargin);
  const [netMargin, setNetMargin] = useState(initialStats.netMargin);
  const skipNextRecalc = useRef(false);

  // Filter entries by selected date range
  const filteredEntries = useMemo(() => {
    // Handle custom date range
    if (dateFilter === "customize" && customFromDate && customToDate) {
      return filterByCustomDateRange(entries, customFromDate, customToDate);
    }
    // Handle preset date ranges
    if (dateFilter !== "customize") {
      return filterByDateRange(entries, dateFilter as DateRange);
    }
    // If customize selected but dates not set, return all entries
    return entries;
  }, [entries, dateFilter, customFromDate, customToDate]);

  useEffect(() => {
    console.log("Profit Lens is now CLIENT — real-time will work");
  }, []);

  const recalcKpis = useCallback(
    (nextEntries: Entry[], nextFilters = filters) => {
      const nextStats = buildProfitStats(nextEntries);
      setSales(nextStats.sales);
      setCogs(nextStats.cogs);
      setOpex(nextStats.opex);
      setGrossProfit(nextStats.grossProfit);
      setNetProfit(nextStats.netProfit);
      setGrossMargin(nextStats.grossMargin);
      setNetMargin(nextStats.netMargin);
      return nextStats;
    },
    [], // CRITICAL: Empty deps - don't recreate on filter changes to prevent re-subscriptions
  );

  const refetchEntries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("entries")
        .select(ENTRY_SELECT)
        .eq("user_id", userId)
        .order("entry_date", { ascending: false });

      if (error) {
        throw error;
      }

      const nextEntries = data?.map((entry) => normalizeEntry(entry)) ?? [];
      skipNextRecalc.current = true;
      setEntries(nextEntries);
      return nextEntries;
    } catch (error) {
      console.error("Failed to refetch entries for Profit Lens", error);
      return undefined;
    }
  }, [supabase, userId]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let retryAttempt = 0;
    let hasAlertedRealtimeFailure = false;
    let isMounted = true;

    console.info("[Realtime Load] Changes applied – backoff max 30s");

    const alertRealtimeFailure = () => {
      if (hasAlertedRealtimeFailure) return;
      hasAlertedRealtimeFailure = true;
      if (typeof window !== "undefined") {
        showWarning("Realtime failed – refresh");
      }
    };

    const logCloseReason = (
      event?: { code?: number; reason?: string },
      payload?: unknown,
    ) => {
      const code = event?.code ?? "unknown";
      const reason = (event?.reason ?? "none").trim() || "none";
      let payloadSummary: string;
      try {
        payloadSummary =
          payload === undefined
            ? "none"
            : JSON.stringify(payload, (_key, value) =>
                typeof value === "bigint" ? Number(value) : value,
              );
      } catch {
        payloadSummary = "unserializable";
      }
      console.warn(
        `[Realtime Closed] Code ${code}: ${reason} payload ${payloadSummary} (profit-lens channel)`,
      );
    };

    const teardownChannel = () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const startHeartbeat = () => {
      if (heartbeatTimer || !channel) return;
      heartbeatTimer = setInterval(() => {
        channel?.send({
          type: "broadcast",
          event: "heartbeat",
          payload: {},
          topic: "heartbeat",
        } as any);
      }, 30000);
    };

    const subscribe = () => {
      teardownChannel();

      channel = supabase
        .channel(`public:entries:${userId}:profit`)
        .on("system", { event: "*" }, (systemPayload) => {
          console.log("[Realtime System]", systemPayload);
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "entries",
            filter: `user_id=eq.${userId}`,
          },
          async (payload) => {
            console.log("REAL-TIME: payload received", payload);
            const latestEntries = await refetchEntries();
            if (!latestEntries) {
              return;
            }
            console.log("REAL-TIME: refetch complete – entries count:", latestEntries.length);
            // Filter entries by current date range before recalculating
            let filteredLatest: Entry[];
            if (dateFilter === "customize" && customFromDate && customToDate) {
              filteredLatest = filterByCustomDateRange(latestEntries, customFromDate, customToDate);
            } else if (dateFilter !== "customize") {
              filteredLatest = filterByDateRange(latestEntries, dateFilter as DateRange);
            } else {
              filteredLatest = latestEntries;
            }
            const updatedStats = recalcKpis(filteredLatest);
            console.log(
              "REAL-TIME: KPIs recalculated → net profit:",
              updatedStats.netProfit,
              "sales:",
              updatedStats.sales,
            );
          },
        )
        .subscribe(async (status) => {
          console.log(`[Realtime] Status: ${status}`);
          if (status === "SUBSCRIBED") {
            console.log("[Realtime] joined public:entries Profit Lens channel");
            retryAttempt = 0;
            hasAlertedRealtimeFailure = false;
            startHeartbeat();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            logCloseReason(undefined, { status });
            console.error("[Realtime Error] Closed – scheduling retry");
            teardownChannel();
            // Note: DO NOT call refreshSession() here - it causes 429 rate limiting
            // Middleware handles session refresh automatically
            scheduleRetry();
          }
        });

      const socket = (channel as unknown as { socket?: { onClose?: (cb: (event?: CloseEvent) => void) => void } })
        ?.socket;
      socket?.onClose?.((event?: CloseEvent) => logCloseReason(event, { source: "socket" }));
    };

    const scheduleRetry = () => {
      if (!isMounted || retryTimer) {
        return;
      }
      if (retryAttempt >= MAX_REALTIME_RECONNECT_ATTEMPTS) {
        console.error("[Realtime Error] Max retries reached for Profit Lens channel.");
        alertRealtimeFailure();
        return;
      }
      const attemptIndex = retryAttempt + 1;
      const exponentialDelay = BASE_REALTIME_DELAY_MS * 2 ** retryAttempt;
      const delay = Math.min(exponentialDelay, MAX_REALTIME_DELAY_MS);
      console.warn(
        `[Realtime Retry] attempt ${attemptIndex} in ${delay}ms (profit-lens channel)`,
      );
      retryTimer = setTimeout(() => {
        retryTimer = null;
        retryAttempt = attemptIndex;
        subscribe();
      }, delay);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Note: DO NOT call refreshSession() here - middleware handles it
        // Just reconnect the Realtime channel if needed
        if (!channel || channel.state !== "joined") {
          retryAttempt = 0;
          hasAlertedRealtimeFailure = false;
          subscribe();
        }
      }
    };

    subscribe();

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isMounted = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      teardownChannel();
    };
  }, [recalcKpis, refetchEntries, supabase, userId]);

  useEffect(() => {
    if (skipNextRecalc.current) {
      skipNextRecalc.current = false;
      return;
    }
    recalcKpis(filteredEntries, filters);
  }, [filteredEntries, filters, recalcKpis]);

  // Dynamic date range label
  const dateRangeLabel = useMemo(() => {
    if (dateFilter === "customize" && customFromDate && customToDate) {
      return formatCustomDateLabel(customFromDate, customToDate);
    }
    if (dateFilter !== "customize") {
      return getDateRangeLabel(dateFilter as DateRange);
    }
    return "Select date range";
  }, [dateFilter, customFromDate, customToDate]);

  // Calculate total expenses (COGS + OPEX)
  const totalExpenses = useMemo(() => cogs + opex, [cogs, opex]);

  // Calculate Top 5 Expenses - Individual transactions ranked by amount
  const topExpenses = useMemo(() => {
    return filteredEntries
      .filter(entry => {
        // Include all Cash Outflow entries (COGS, Opex, Assets)
        return entry.entry_type === 'Cash Outflow';
      })
      .map(entry => ({
        ...entry,
        type: entry.category === 'COGS' ? 'COGS' : entry.category === 'Opex' ? 'OPEX' : 'OTHER'
      }))
      .sort((a, b) => b.amount - a.amount) // Sort by individual amount
      .slice(0, 5); // Top 5 individual transactions
  }, [filteredEntries]);

  return (
      <div className="flex flex-col gap-3 md:gap-4 text-white pb-32">
      {/* Page Header - Title and Date Filter on Same Line */}
      <div className="flex items-center justify-between mt-2 mb-3">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          See what you earned
        </h1>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <label className="text-purple-300 text-sm hidden md:inline">Date:</label>
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setShowCustomDatePickers(e.target.value === "customize");
            }}
            className="px-3 py-2 bg-[#1a1a2e] border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
            <option value="last-year">Last Year</option>
            <option value="all-time">All Time</option>
            <option value="customize">Customize</option>
          </select>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {showCustomDatePickers && (
        <div className="flex flex-wrap items-center gap-2 -mt-2 mb-2">
          <span className="text-sm text-muted-foreground">From:</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="px-3 py-2 border border-border bg-secondary rounded-lg text-sm text-white hover:bg-primary/80 focus:border-purple-500 focus:outline-none">
                {customFromDate ? format(customFromDate, "MMM dd, yyyy") : "Select date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customFromDate}
                onSelect={setCustomFromDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-sm text-muted-foreground">To:</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="px-3 py-2 border border-border bg-secondary rounded-lg text-sm text-white hover:bg-primary/80 focus:border-purple-500 focus:outline-none">
                {customToDate ? format(customToDate, "MMM dd, yyyy") : "Select date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customToDate}
                onSelect={setCustomToDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Simplified 3-Line Profit Calculation - Compact on Mobile */}
      <section className="rounded-lg md:rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/40 to-purple-800/40 p-4 md:p-6 lg:p-8 shadow-xl md:shadow-2xl shadow-black/40">
        <div className="space-y-3 md:space-y-6">
          {/* Line 1: Sales */}
          <div className="border-b border-purple-500/30 pb-3 md:pb-5">
            <p className="text-xs md:text-sm uppercase tracking-[0.15em] md:tracking-[0.2em] text-purple-300 font-semibold mb-2 md:mb-3">
              Sales
            </p>
            <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-1 md:mb-2">
              {currencyFormatter.format(sales)}
            </p>
            <p className="text-sm md:text-base lg:text-lg text-purple-200 font-medium">
              {formatAmountInWordsShort(sales)}
            </p>
          </div>

          {/* Line 2: Total Expenses (COGS + OPEX) */}
          <div className="border-b border-purple-500/30 pb-3 md:pb-5">
            <p className="text-xs md:text-sm uppercase tracking-[0.15em] md:tracking-[0.2em] text-purple-300 font-semibold mb-2 md:mb-3 flex items-center gap-1 md:gap-2">
              <span className="text-base md:text-xl">−</span> Total Expenses
            </p>
            <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-1 md:mb-2">
              {currencyFormatter.format(totalExpenses)}
            </p>
            <p className="text-sm md:text-base lg:text-lg text-purple-200 font-medium">
              {formatAmountInWordsShort(totalExpenses)}
            </p>
            <p className="text-xs md:text-sm text-purple-400 mt-1 md:mt-2">
              COGS: {currencyFormatter.format(cogs)} + OPEX: {currencyFormatter.format(opex)}
            </p>
          </div>

          {/* Line 3: Net Profit with Net Margin % on Same Line */}
          <div className="bg-purple-900/30 rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border border-purple-400/40 shadow-[0_0_15px_rgba(167,139,250,0.3)] md:shadow-[0_0_25px_rgba(167,139,250,0.3)]">
            <div className="flex items-start justify-between mb-2 md:mb-3">
              <p className="text-xs md:text-sm uppercase tracking-[0.15em] md:tracking-[0.2em] text-purple-300 font-semibold flex items-center gap-1 md:gap-2">
                <span className="text-base md:text-xl">=</span> Net Profit
              </p>
              {/* Net Margin % - Same line, right side */}
              <div className="text-right">
                <div className="text-lg md:text-xl lg:text-2xl font-bold text-purple-300">
                  {percentageFormatter(netMargin)}
                </div>
                <div className="text-purple-400 text-[10px] md:text-xs">
                  Net Margin
                </div>
              </div>
            </div>
            <p className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-1 md:mb-2">
              {currencyFormatter.format(netProfit)}
            </p>
            <p className="text-sm md:text-lg lg:text-xl text-purple-200 font-medium">
              {formatAmountInWordsShort(netProfit)}
            </p>
          </div>
        </div>
      </section>

      {/* COGS and OPEX Breakdown */}
      <section className="mt-4 md:mt-6">
        <h3 className="text-white text-base md:text-lg font-semibold mb-3 md:mb-4 px-1">
          Expense Breakdown
        </h3>

        <div className="grid grid-cols-2 gap-2 md:gap-4">
          {/* COGS */}
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 md:p-4 lg:p-5">
            <h4 className="text-purple-300 text-xs md:text-sm font-medium mb-1 md:mb-2 uppercase tracking-[0.15em]">
              COGS
            </h4>
            <div className="text-xl md:text-2xl lg:text-2xl font-bold text-white mb-0.5 md:mb-1">
              {currencyFormatter.format(cogs)}
            </div>
            <p className="text-purple-300 text-xs md:text-sm">
              {formatAmountInWordsShort(cogs)}
            </p>
            <p className="text-purple-400 text-[10px] md:text-xs mt-1">
              Cost of Goods Sold
            </p>
          </div>

          {/* OPEX */}
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 md:p-4 lg:p-5">
            <h4 className="text-purple-300 text-xs md:text-sm font-medium mb-1 md:mb-2 uppercase tracking-[0.15em]">
              OPEX
            </h4>
            <div className="text-xl md:text-2xl lg:text-2xl font-bold text-white mb-0.5 md:mb-1">
              {currencyFormatter.format(opex)}
            </div>
            <p className="text-purple-300 text-xs md:text-sm">
              {formatAmountInWordsShort(opex)}
            </p>
            <p className="text-purple-400 text-[10px] md:text-xs mt-1">
              Operating Expenses
            </p>
          </div>
        </div>
      </section>

      {/* Top 5 Expenses */}
      <section className="mt-4 md:mt-6">
        <h3 className="text-white text-base md:text-lg font-semibold mb-3 md:mb-4 px-1">
          Top 5 Expenses
        </h3>

        <div className="space-y-2 md:space-y-3">
          {topExpenses.length === 0 ? (
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 md:p-8 text-center">
              <p className="text-purple-300 text-sm md:text-base">
                No expense data available for the selected period
              </p>
            </div>
          ) : (
            topExpenses.map((expense, index) => {
              const formatted = formatCurrencyWithWords(expense.amount);

              return (
                <div
                  key={expense.id}
                  className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 md:p-4 hover:bg-purple-900/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        <span className="text-purple-400 font-bold text-sm md:text-base">
                          {index + 1}.
                        </span>
                        <span className="text-white font-bold text-lg md:text-xl lg:text-2xl">
                          {formatted.formatted}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-purple-200 text-sm md:text-base font-medium">
                          {expense.category}
                        </span>
                        <span className="text-purple-400 text-xs md:text-sm">
                          ({expense.type})
                        </span>
                      </div>

                      <p className="text-purple-300 text-xs md:text-sm mb-1">
                        {formatted.words}
                      </p>

                      {expense.notes && (
                        <p className="text-purple-400 text-xs italic truncate">
                          "{expense.notes}"
                        </p>
                      )}

                      <p className="text-purple-500 text-[10px] md:text-xs mt-1">
                        {new Date(expense.entry_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

type ProfitStats = {
  sales: number;
  cogs: number;
  opex: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
};

function buildProfitStats(entries: Entry[]): ProfitStats {
  let sales = 0;
  let cogs = 0;
  let opex = 0;

  entries.forEach((entry) => {
    if (entry.entry_type === "Cash Inflow" && entry.category === "Sales") {
      sales += entry.amount;
    } else if (entry.entry_type === "Cash Outflow") {
      if (entry.category === "COGS") {
        cogs += entry.amount;
      } else if (entry.category === "Opex") {
        opex += entry.amount;
      }
    }
  });

  const grossProfit = sales - cogs;
  const netProfit = grossProfit - opex;
  const grossMargin = sales > 0 ? grossProfit / sales : 0;
  const netMargin = sales > 0 ? netProfit / sales : 0;

  return {
    sales,
    cogs,
    opex,
    grossProfit,
    netProfit,
    grossMargin,
    netMargin,
  };
}
