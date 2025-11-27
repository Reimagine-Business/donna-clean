"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, subDays } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Activity } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import {
  Entry,
  PAYMENT_METHODS,
  type CashPaymentMethod,
  type PaymentMethod,
  normalizeEntry,
} from "@/lib/entries";
import { cn } from "@/lib/utils";
import { SettleEntryDialog } from "@/components/settlement/settle-entry-dialog";
import { SettlementSummaryCard } from "@/components/settlements/settlement-summary-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download } from "lucide-react";
import {
  filterByDateRange,
  filterByCustomDateRange,
  getDateRangeLabel,
  formatCustomDateLabel,
  type DateRange
} from "@/lib/date-utils";

type CashpulseShellProps = {
  initialEntries: Entry[];
  userId: string;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
});

const formatDisplayDate = (date: string) => format(new Date(date), "dd MMM");

const isWithinRange = (date: string, start: string, end: string) =>
  date >= start && date <= end;

const ENTRY_SELECT =
  "id, user_id, entry_type, category, payment_method, amount, remaining_amount, entry_date, notes, image_url, settled, settled_at, created_at, updated_at";

const CASH_METHOD_LOOKUP = new Set<string>(PAYMENT_METHODS);

const isCashPaymentMethod = (method: PaymentMethod): method is CashPaymentMethod =>
  CASH_METHOD_LOOKUP.has(method);

const logCashpulseSkip = (entry: Entry, reason: string) => {
  console.log(
    `[Cashpulse Skip] ${reason} ID ${entry.id}: type=${entry.entry_type}, category=${entry.category}, payment=${entry.payment_method}, settled=${entry.settled}, remaining=${entry.remaining_amount}`,
  );
};

const MAX_REALTIME_RECONNECT_ATTEMPTS = 5;
const BASE_REALTIME_DELAY_MS = 5000;
const MAX_REALTIME_DELAY_MS = 30000;

export function CashpulseShell({ initialEntries, userId }: CashpulseShellProps) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<Entry[]>(initialEntries.map(normalizeEntry));
  const [settlementEntry, setSettlementEntry] = useState<Entry | null>(null);
  const [historyFilters, setHistoryFilters] = useState({
    start_date: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [dateFilter, setDateFilter] = useState("this-month");
  const [showCustomDatePickers, setShowCustomDatePickers] = useState(false);
  const [customFromDate, setCustomFromDate] = useState<Date>();
  const [customToDate, setCustomToDate] = useState<Date>();

  const initialStatsRef = useRef<CashpulseStats | null>(null);
  if (!initialStatsRef.current) {
    // Filter initial entries by default date range (this-month)
    const filteredInitial = filterByDateRange(initialEntries, "this-month" as DateRange);
    initialStatsRef.current = buildCashpulseStats(filteredInitial);
  }
  const initialStats = initialStatsRef.current as CashpulseStats;

  const [inflow, setInflow] = useState(initialStats.cashInflow);
  const [outflow, setOutflow] = useState(initialStats.cashOutflow);
  const [net, setNet] = useState(initialStats.netCashFlow);
  const [cashBreakdown, setCashBreakdown] = useState(initialStats.cashBreakdown);
  const [pendingCollections, setPendingCollections] = useState(initialStats.pendingCollections);
  const [pendingBills, setPendingBills] = useState(initialStats.pendingBills);
  const [pendingAdvances, setPendingAdvances] = useState(initialStats.pendingAdvances);
  const [history, setHistory] = useState(initialStats.history);

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
    console.log("Cashpulse is now CLIENT — real-time will work");
  }, []);

  const recalcKpis = useCallback(
    (nextEntries: Entry[], nextFilters = historyFilters) => {
      const updatedStats = buildCashpulseStats(nextEntries);
      setInflow(updatedStats.cashInflow);
      setOutflow(updatedStats.cashOutflow);
      setNet(updatedStats.netCashFlow);
      setCashBreakdown(updatedStats.cashBreakdown);
      setPendingCollections(updatedStats.pendingCollections);
      setPendingBills(updatedStats.pendingBills);
      setPendingAdvances(updatedStats.pendingAdvances);
      setHistory(updatedStats.history);
      return updatedStats;
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
      console.error("Failed to refetch entries for Cashpulse", error);
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
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert("Realtime failed – refresh");
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
        `[Realtime Closed] Code ${code}: ${reason} payload ${payloadSummary} (cashpulse channel)`,
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
        .channel(`public:entries:${userId}`)
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
            const realtimeSales = updatedStats.cashBreakdown
              .filter(
                (channelBreakdown) =>
                  channelBreakdown.method === "Cash" || channelBreakdown.method === "Bank",
              )
              .reduce((sum, channelBreakdown) => sum + channelBreakdown.value, 0);
            console.log(
              "REAL-TIME: KPIs recalculated → inflow:",
              updatedStats.cashInflow,
              "sales:",
              realtimeSales,
            );
          },
        )
        .subscribe(async (status) => {
          console.log(`[Realtime] Status: ${status}`);
          if (status === "SUBSCRIBED") {
            console.log("[Realtime] joined public:entries Cashpulse channel");
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
        console.error("[Realtime Error] Max retries reached for Cashpulse channel.");
        alertRealtimeFailure();
        return;
      }
      const attemptIndex = retryAttempt + 1;
      const exponentialDelay = BASE_REALTIME_DELAY_MS * 2 ** retryAttempt;
      const delay = Math.min(exponentialDelay, MAX_REALTIME_DELAY_MS);
      console.warn(
        `[Realtime Retry] attempt ${attemptIndex} in ${delay}ms (cashpulse channel)`,
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
    recalcKpis(filteredEntries, historyFilters);
  }, [filteredEntries, historyFilters, recalcKpis]);

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

  // Function to get date range for settlement history filter
  const getSettlementDateRange = useMemo(() => {
    const now = new Date();

    switch (dateFilter) {
      case "this-month":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };

      case "last-month":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          to: new Date(now.getFullYear(), now.getMonth(), 0),
        };

      case "this-year":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(now.getFullYear(), 11, 31),
        };

      case "last-year":
        return {
          from: new Date(now.getFullYear() - 1, 0, 1),
          to: new Date(now.getFullYear() - 1, 11, 31),
        };

      case "all-time":
        return {
          from: new Date(2000, 0, 1), // Far past date
          to: new Date(2099, 11, 31), // Far future date
        };

      case "customize":
        if (customFromDate && customToDate) {
          return {
            from: customFromDate,
            to: customToDate,
          };
        }
        // Default to this month if custom dates not set
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };

      default:
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
    }
  }, [dateFilter, customFromDate, customToDate]);

  // Filter settlement history based on date range
  const filteredHistory = useMemo(() => {
    return history.filter((entry) => {
      const settlementDate = new Date(entry.settled_at ?? entry.entry_date);
      const fromDate = new Date(getSettlementDateRange.from);
      const toDate = new Date(getSettlementDateRange.to);

      // Set time to start/end of day for accurate comparison
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      settlementDate.setHours(0, 0, 0, 0);

      return settlementDate >= fromDate && settlementDate <= toDate;
    });
  }, [history, getSettlementDateRange]);

  const handleExportHistory = () => {
    if (!filteredHistory.length) {
      alert("No settlements to export for the selected date range.");
      return;
    }

    const headers = [
      "Date",
      "Entry Type",
      "Category",
      "Amount",
      "Payment Method",
      "Notes",
    ];

    const rows = filteredHistory.map((entry) => [
      format(new Date(entry.settled_at ?? entry.entry_date), "MMM dd, yyyy"),
      entry.entry_type,
      entry.category,
      `₹${entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      entry.payment_method,
      (entry.notes || "-").replace(/"/g, '""'),
    ]);

    const csvContent = [headers, ...rows]
      .map((line) => line.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Generate filename with date range
    const fromDate = format(getSettlementDateRange.from, "yyyy-MM-dd");
    const toDate = format(getSettlementDateRange.to, "yyyy-MM-dd");
    const filename = `settlement-history-${fromDate}-to-${toDate}.csv`;

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-8 text-white">
      {/* Page Header - Title and Date Filter on Same Line */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Cashpulse
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

        <section className="grid gap-2 md:gap-4 md:grid-cols-3">
          <StatCard
            title="Total Cash Inflow"
            value={currencyFormatter.format(inflow)}
            subtitle={dateRangeLabel}
            variant="positive"
          />
          <StatCard
            title="Total Cash Outflow"
            value={currencyFormatter.format(outflow)}
            subtitle={dateRangeLabel}
            variant="negative"
          />
          <StatCard
            title="Net Cash Flow"
            value={currencyFormatter.format(net)}
            subtitle={dateRangeLabel}
            variant="neutral"
          />
        </section>

        <section className="grid gap-2 md:gap-4 md:grid-cols-2">
          {cashBreakdown.map((channel) => (
            <ChannelCard
              key={channel.method}
              method={channel.method}
              value={currencyFormatter.format(channel.value)}
            />
          ))}
        </section>

        {/* Settlement Summary Cards - Compact View Only */}
        <section className="space-y-4 mt-6">
          <SettlementSummaryCard
            type="collections"
            count={pendingCollections.count}
            amount={pendingCollections.total}
            items={pendingCollections.entries}
            onSettle={setSettlementEntry}
          />

          <SettlementSummaryCard
            type="bills"
            count={pendingBills.count}
            amount={pendingBills.total}
            items={pendingBills.entries}
            onSettle={setSettlementEntry}
          />

          <SettlementSummaryCard
            type="advances"
            count={pendingAdvances.count}
            amount={pendingAdvances.total}
            items={pendingAdvances.entries}
            onSettle={setSettlementEntry}
          />
        </section>

        <section className="rounded-xl md:rounded-3xl border border-border bg-card/40 p-3 md:p-6 shadow-2xl shadow-black/40">
          <div className="mb-3 md:mb-4 flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground">Settlement History</p>
              <h2 className="text-base md:text-2xl font-semibold text-white">Cash vs profit reconciled</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* Date Range Selector */}
              <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                <span className="text-[10px] md:text-sm text-muted-foreground">Date:</span>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setShowCustomDatePickers(e.target.value === "customize");
                  }}
                  className="px-2 md:px-3 py-1 md:py-2 border border-border bg-secondary rounded-lg text-[10px] md:text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="this-year">This Year</option>
                  <option value="last-year">Last Year</option>
                  <option value="all-time">All Time</option>
                  <option value="customize">Customize</option>
                </select>

                {/* Show calendar pickers when Customize is selected */}
                {showCustomDatePickers && (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="px-2 md:px-3 py-1 md:py-2 border border-border bg-secondary rounded-lg text-[10px] md:text-sm text-white hover:bg-primary/80 focus:border-purple-500 focus:outline-none">
                          {customFromDate ? format(customFromDate, "MMM dd, yyyy") : "From Date"}
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

                    <span className="text-[10px] md:text-sm text-muted-foreground">to</span>

                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="px-2 md:px-3 py-1 md:py-2 border border-border bg-secondary rounded-lg text-[10px] md:text-sm text-white hover:bg-primary/80 focus:border-purple-500 focus:outline-none">
                          {customToDate ? format(customToDate, "MMM dd, yyyy") : "To Date"}
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
                  </>
                )}
              </div>

              {/* Export CSV Button */}
              <button
                onClick={handleExportHistory}
                disabled={filteredHistory.length === 0}
                className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1 md:py-2 bg-secondary/80 text-white rounded-lg hover:bg-primary/70 text-[10px] md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xs md:text-base">📥</span>
                <span>Export CSV</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead>
                <tr className="text-left text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="px-2 md:px-3 py-1.5 md:py-2">Date</th>
                  <th className="px-2 md:px-3 py-1.5 md:py-2">Entry Type</th>
                  <th className="px-2 md:px-3 py-1.5 md:py-2">Category</th>
                  <th className="px-2 md:px-3 py-1.5 md:py-2">Amount</th>
                  <th className="px-2 md:px-3 py-1.5 md:py-2 hidden md:table-cell">Payment Method</th>
                  <th className="px-2 md:px-3 py-1.5 md:py-2 hidden md:table-cell">Notes</th>
                  <th className="px-2 md:px-3 py-1.5 md:py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 md:px-3 py-6 md:py-8 text-center text-xs md:text-sm text-muted-foreground">
                      No settlements match your date filter.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-t border-border/50 bg-white/5 text-slate-100 transition hover:bg-white/10"
                    >
                      <td className="px-2 md:px-3 py-2 md:py-3 font-medium text-[10px] md:text-sm">
                        {format(new Date(entry.settled_at ?? entry.entry_date), "dd MMM yyyy")}
                      </td>
                      <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-sm">{entry.entry_type}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3 text-[10px] md:text-sm">{entry.category}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3 font-semibold text-white text-xs md:text-sm">
                        {currencyFormatter.format(entry.amount)}
                      </td>
                      <td className="px-3 py-3 text-sm hidden md:table-cell">{entry.payment_method}</td>
                      <td className="px-3 py-3 max-w-[220px] truncate text-sm hidden md:table-cell">{entry.notes ?? "—"}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3 text-right text-[9px] md:text-xs uppercase tracking-[0.2em] text-emerald-300">
                        Settled
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <SettleEntryDialog entry={settlementEntry} onClose={() => setSettlementEntry(null)} />
      </div>
    );
  }

type CashpulseStats = {
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  cashBreakdown: { method: string; value: number }[];
  pendingCollections: PendingList;
  pendingBills: PendingList;
  pendingAdvances: PendingList;
  history: Entry[];
};

type PendingList = {
  count: number;
  total: number;
  entries: Entry[];
};

const toPendingList = (entries: Entry[]): PendingList => ({
  count: entries.length,
  total: entries.reduce((sum, entry) => sum + entry.amount, 0),
  entries,
});

const buildCashpulseStats = (entries: Entry[]): CashpulseStats => {
  let cashInflow = 0;
  let cashOutflow = 0;

  const paymentTotals = PAYMENT_METHODS.reduce<Record<CashPaymentMethod, number>>(
    (acc, method) => {
      acc[method] = 0;
      return acc;
    },
    {} as Record<CashPaymentMethod, number>,
  );

  const pendingCollections: Entry[] = [];
  const pendingBills: Entry[] = [];
  const pendingAdvances: Entry[] = [];
  const settledHistory: Entry[] = [];

  entries.forEach((entry) => {
    const paymentIsCash = isCashPaymentMethod(entry.payment_method);
    const isCashInflow = entry.entry_type === "Cash Inflow";
    const isCashOutflow = entry.entry_type === "Cash Outflow";
    const isCredit = entry.entry_type === "Credit";
    const isAdvance = entry.entry_type === "Advance";
    const isAdvanceSales = isAdvance && entry.category === "Sales";
    const isAdvanceExpense =
      isAdvance && (entry.category === "COGS" || entry.category === "Opex" || entry.category === "Assets");
    const isCreditSales = isCredit && entry.category === "Sales";
    const isCreditExpense =
      isCredit && (entry.category === "COGS" || entry.category === "Opex");
    const hasCollectibleBalance = entry.remaining_amount > 0 && !entry.settled;

    let countedCashMovement = false;

    if (isCashInflow) {
      if (paymentIsCash) {
        cashInflow += entry.amount;
        countedCashMovement = true;
      } else {
        logCashpulseSkip(entry, "Cash Inflow requires Cash/Bank payment");
      }
    } else if (isCashOutflow) {
      if (paymentIsCash) {
        cashOutflow += entry.amount;
        countedCashMovement = true;
      } else {
        logCashpulseSkip(entry, "Cash Outflow requires Cash/Bank payment");
      }
    } else if (isAdvanceSales) {
      if (paymentIsCash) {
        cashInflow += entry.amount;
        countedCashMovement = true;
      } else {
        logCashpulseSkip(entry, "Advance Sales must use Cash/Bank to count as cash");
      }
    } else if (isAdvanceExpense) {
      if (paymentIsCash) {
        cashOutflow += entry.amount;
        countedCashMovement = true;
      } else {
        logCashpulseSkip(entry, "Advance expenses must use Cash/Bank to count as cash");
      }
    } else {
      logCashpulseSkip(entry, "Entry excluded from cash totals");
    }

    if (countedCashMovement) {
      if (paymentIsCash) {
        paymentTotals[entry.payment_method as CashPaymentMethod] += entry.amount;
      } else {
        logCashpulseSkip(entry, "Cash movement missing Cash/Bank method");
      }
    }

    if (isCreditSales) {
      if (hasCollectibleBalance) {
        pendingCollections.push(entry);
      } else {
        logCashpulseSkip(entry, "Pending Collections skip (settled or zero balance)");
      }
    }

    if (isCreditExpense) {
      if (hasCollectibleBalance) {
        pendingBills.push(entry);
      } else {
        logCashpulseSkip(entry, "Pending Bills skip (settled or zero balance)");
      }
    }

    if (isAdvance) {
      if (!entry.settled && hasCollectibleBalance) {
        pendingAdvances.push(entry);
      } else if (!entry.settled) {
        logCashpulseSkip(entry, "Pending Advances skip (no outstanding balance)");
      }
    }

    if (entry.settled && (isCredit || isAdvance)) {
      settledHistory.push(entry);
    }
  });

  settledHistory.sort((a, b) => {
    const aDate = a.settled_at ?? a.entry_date;
    const bDate = b.settled_at ?? b.entry_date;
    return bDate.localeCompare(aDate);
  });

  return {
    cashInflow,
    cashOutflow,
    netCashFlow: cashInflow - cashOutflow,
    cashBreakdown: PAYMENT_METHODS.map((method) => ({
      method,
      value: paymentTotals[method],
    })),
    pendingCollections: toPendingList(pendingCollections),
    pendingBills: toPendingList(pendingBills),
    pendingAdvances: toPendingList(pendingAdvances),
    history: settledHistory,
  };
};

type StatCardProps = {
  title: string;
  value: string;
  subtitle: string;
  variant: "positive" | "negative" | "neutral";
};

function StatCard({ title, value, subtitle, variant }: StatCardProps) {
  const colorMap = {
    positive: "from-emerald-500/40 to-emerald-500/5 border-emerald-500/40",
    negative: "from-rose-500/40 to-rose-500/5 border-rose-500/40",
    neutral: "from-[#a78bfa]/40 to-[#a78bfa]/5 border-primary/40",
  };

  const icon =
    variant === "positive"
      ? ArrowUpRight
      : variant === "negative"
        ? ArrowDownRight
        : Activity;
  const Icon = icon;

  return (
    <div
      className={cn(
        "rounded-lg md:rounded-2xl border bg-gradient-to-br p-3 md:p-5 shadow-xl shadow-black/40",
        colorMap[variant],
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <Icon className="h-3 w-3 md:h-4 md:w-4 text-white/70" />
          <span className="text-base font-semibold text-white uppercase tracking-widest">{title}</span>
        </div>
        <p className="text-xl md:text-3xl font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

type ChannelCardProps = {
  method: string;
  value: string;
};

function ChannelCard({ method, value }: ChannelCardProps) {
  return (
    <div className="rounded-lg md:rounded-2xl border border-border bg-card/60 p-3 md:p-5 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white uppercase tracking-[0.3em]">Channel</p>
          <p className="mt-1 text-sm md:text-lg font-semibold text-white">{method}</p>
        </div>
        <p className={cn("text-xl font-semibold", value.startsWith("-") ? "text-rose-300" : "text-primary")}>
          {value}
        </p>
      </div>
    </div>
  );
}

