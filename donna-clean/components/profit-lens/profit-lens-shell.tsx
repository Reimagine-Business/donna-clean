"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { Entry, normalizeEntry } from "@/lib/entries";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
    initialStatsRef.current = buildProfitStats(initialEntries);
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
            const updatedStats = recalcKpis(latestEntries);
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
    recalcKpis(entries, filters);
  }, [entries, filters, recalcKpis]);

  const rangeLabel = `${format(new Date(filters.start_date), "dd MMM")} — ${format(
    new Date(filters.end_date),
    "dd MMM",
  )}`;

  const plRows = [
    { label: "Sales", value: sales, variant: "positive" as RowVariant },
    { label: "Cost of Goods Sold", value: cogs, variant: "negative" as RowVariant },
    { label: "Gross Profit", value: grossProfit, variant: "neutral" as RowVariant },
    { label: "Operating Expenses", value: opex, variant: "negative" as RowVariant },
    { label: "Net Profit", value: netProfit, variant: "positive" as RowVariant },
  ];

  return (
      <div className="flex flex-col gap-4 md:gap-8 text-white">
      <div className="flex flex-col gap-2 md:gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground">Donna · Profit Lens</p>
          <h1 className="text-xl md:text-4xl font-semibold">Profit Lens</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Accrual basis for {rangeLabel}</p>
        </div>
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
            <option value="this-month">📅 This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
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
      </div>

      <section className="rounded-xl md:rounded-3xl border border-border bg-card/40 p-3 md:p-6 shadow-2xl shadow-black/40">
        <div className="space-y-2 md:space-y-4">
          {plRows.map((row, index) => (
            <div
              key={row.label}
              className={cn(
                "flex items-center justify-between rounded-lg md:rounded-2xl border border-border/50 bg-slate-950/30 p-2 md:p-4",
                index === plRows.length - 1 ? "shadow-[0_0_25px_rgba(167,139,250,0.2)]" : "",
              )}
            >
              <p className="text-[10px] md:text-sm uppercase tracking-[0.3em] text-muted-foreground">{row.label}</p>
                <p className={cn("text-base md:text-3xl font-semibold", rowColor(row.variant))}>
                {currencyFormatter.format(row.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

        <section className="grid gap-2 md:gap-4 md:grid-cols-2">
          <MetricCard
            title="Gross Margin"
            value={percentageFormatter(grossMargin)}
            subtitle="Gross profit ÷ sales"
          />
          <MetricCard
            title="Net Profit Margin"
            value={percentageFormatter(netMargin)}
            subtitle="Net profit ÷ sales"
          />
        </section>

      <section className="space-y-2 md:space-y-4">
        <div className="flex flex-col gap-1 md:gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground">Top Expense Breakdown</p>
            <h2 className="text-base md:text-2xl font-semibold text-white">Where cash is leaving</h2>
          </div>
        </div>
          <div className="grid gap-2 md:gap-4 md:grid-cols-2">
            <BreakdownCard
              title="Cost of Goods Sold"
              value={currencyFormatter.format(cogs)}
              description="Direct inputs tied to sales"
            />
            <BreakdownCard
              title="Other Expenses"
              value={currencyFormatter.format(opex)}
              description="Operating and overhead costs"
            />
          </div>
      </section>

        <section className="rounded-xl md:rounded-3xl border border-border bg-gradient-to-br from-[#a78bfa]/30 to-[#a78bfa]/10 p-3 md:p-6 text-white shadow-[0_0_35px_rgba(167,139,250,0.25)]">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-white/80">Total Sales</p>
          <p className="mt-2 md:mt-4 text-xl md:text-4xl font-semibold">{currencyFormatter.format(sales)}</p>
          <p className="mt-1 md:mt-2 text-xs md:text-sm text-white/70">
            Includes cash inflows and credit sales captured this period.
          </p>
        </section>
    </div>
  );
}

type RowVariant = "positive" | "negative" | "neutral";

const rowColor = (variant: RowVariant) => {
  switch (variant) {
    case "positive":
      return "text-emerald-300";
    case "negative":
      return "text-rose-300";
    default:
      return "text-white";
  }
};

type MetricCardProps = {
  title: string;
  value: string;
  subtitle: string;
};

function MetricCard({ title, value, subtitle }: MetricCardProps) {
  return (
    <div className="rounded-lg md:rounded-2xl border border-border bg-card/60 p-3 md:p-5 shadow-lg shadow-black/40">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground">{title}</p>
          <p className="mt-1 text-xs md:text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <p className="text-xl md:text-3xl font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

type BreakdownCardProps = {
  title: string;
  value: string;
  description: string;
};

function BreakdownCard({ title, value, description }: BreakdownCardProps) {
  return (
    <div className="rounded-lg md:rounded-2xl border border-primary/30 bg-gradient-to-br from-[#a78bfa]/20 to-transparent p-3 md:p-5 shadow-lg shadow-primary/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#c4b5fd]">{title}</p>
          <p className="mt-1 text-xs md:text-sm text-[#c4b5fd]">{description}</p>
        </div>
        <p className="text-xl md:text-3xl font-semibold text-white">{value}</p>
      </div>
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
