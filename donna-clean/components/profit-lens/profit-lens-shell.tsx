"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createBrowserClient } from "@/lib/supabase/client";
import { Entry, normalizeEntry } from "@/lib/entries";
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
  "id, user_id, entry_type, category, payment_method, amount, entry_date, notes, image_url, settled, settled_at, created_at, updated_at";

export function ProfitLensShell({ initialEntries, userId }: ProfitLensShellProps) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [entries, setEntries] = useState<Entry[]>(initialEntries.map(normalizeEntry));
  const [filters, setFilters] = useState<FiltersState>({
    start_date: currentStart,
    end_date: currentEnd,
  });

  const [stats, setStats] = useState(() => buildProfitStats(initialEntries, filters));
  const skipNextRecalc = useRef(false);
  const [realtimeUserId, setRealtimeUserId] = useState<string | null>(userId ?? null);

  useEffect(() => {
    console.log("Profit Lens is now CLIENT — real-time will work");
  }, []);

  const recalcKpis = useCallback(
    (nextEntries: Entry[], nextFilters = filters) => {
      const nextStats = buildProfitStats(nextEntries, nextFilters);
      setStats(nextStats);
      console.log("KPIs recalc: inflow", nextStats.netProfit, "sales", nextStats.sales);
    },
    [filters],
  );

  const refetchEntries = useCallback(async () => {
    const targetUserId = realtimeUserId ?? userId;
    if (!targetUserId) {
      console.error("Cannot refetch entries for Profit Lens: missing user id");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("entries")
        .select(ENTRY_SELECT)
        .eq("user_id", targetUserId)
        .order("entry_date", { ascending: false });

      if (error) {
        throw error;
      }

      const nextEntries = data?.map((entry) => normalizeEntry(entry)) ?? [];
      console.log("Refetched entries count (profit lens):", nextEntries.length);
      skipNextRecalc.current = true;
      setEntries(nextEntries);
      recalcKpis(nextEntries);
    } catch (error) {
      console.error("Failed to refetch entries for Profit Lens", error);
    }
    }, [realtimeUserId, recalcKpis, supabase, userId]);

    useEffect(() => {
      let isMounted = true;
      let channel: RealtimeChannel | null = null;

      const setupRealtime = async () => {
        let targetUserId = realtimeUserId ?? userId;

        if (!targetUserId) {
          const { data, error } = await supabase.auth.getUser();
          if (!isMounted) return;
          if (error) {
            console.error("Failed to fetch auth user for realtime (Profit Lens)", error);
            return;
          }
          if (data?.user?.id) {
            setRealtimeUserId(data.user.id);
          }
          return;
        }

        channel = supabase
          .channel("entries-realtime")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "entries",
              filter: `user_id=eq.${targetUserId}`,
            },
            (payload) => {
              console.log("REAL-TIME PAYLOAD:", payload);
              void refetchEntries();
            },
          )
          .subscribe();
        console.log("SUBSCRIPTION CREATED FOR USER:", targetUserId);
      };

      void setupRealtime();

      return () => {
        isMounted = false;
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    }, [realtimeUserId, refetchEntries, supabase, userId]);

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
    { label: "Sales", value: stats.sales, variant: "positive" as RowVariant },
    { label: "Cost of Goods Sold", value: stats.cogs, variant: "negative" as RowVariant },
    { label: "Gross Profit", value: stats.grossProfit, variant: "neutral" as RowVariant },
    { label: "Operating Expenses", value: stats.opex, variant: "negative" as RowVariant },
    { label: "Net Profit", value: stats.netProfit, variant: "positive" as RowVariant },
  ];

  return (
      <div className="flex flex-col gap-8 text-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Donna · Profit Lens</p>
          <h1 className="text-4xl font-semibold">Profit Lens</h1>
          <p className="text-sm text-slate-400">Accrual basis for {rangeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-400">From</p>
            <input
              type="date"
              value={filters.start_date}
              max={filters.end_date}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  start_date: event.target.value,
                }))
              }
              className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
            />
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">To</p>
            <input
              type="date"
              value={filters.end_date}
              min={filters.start_date}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  end_date: event.target.value,
                }))
              }
              className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              setFilters({
                start_date: currentStart,
                end_date: currentEnd,
              })
            }
            className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-[#a78bfa]/60 hover:text-white"
          >
            Current month
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl shadow-black/40">
        <div className="space-y-4">
          {plRows.map((row, index) => (
            <div
              key={row.label}
              className={cn(
                "flex flex-col gap-2 rounded-2xl border border-white/5 bg-slate-950/30 p-4 md:flex-row md:items-center md:justify-between",
                index === plRows.length - 1 ? "shadow-[0_0_25px_rgba(167,139,250,0.2)]" : "",
              )}
            >
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{row.label}</p>
                <p className={cn("text-3xl font-semibold", rowColor(row.variant))}>
                {currencyFormatter.format(row.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Gross Margin"
          value={percentageFormatter(stats.grossMargin)}
          subtitle="Gross profit ÷ sales"
        />
        <MetricCard
          title="Net Profit Margin"
          value={percentageFormatter(stats.netMargin)}
          subtitle="Net profit ÷ sales"
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Top Expense Breakdown</p>
            <h2 className="text-2xl font-semibold text-white">Where cash is leaving</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <BreakdownCard
            title="Cost of Goods Sold"
            value={currencyFormatter.format(stats.cogs)}
            description="Direct inputs tied to sales"
          />
          <BreakdownCard
            title="Other Expenses"
            value={currencyFormatter.format(stats.opex)}
            description="Operating and overhead costs"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#a78bfa]/30 to-[#a78bfa]/10 p-6 text-white shadow-[0_0_35px_rgba(167,139,250,0.25)]">
        <p className="text-xs uppercase tracking-[0.3em] text-white/80">Total Sales</p>
        <p className="mt-4 text-4xl font-semibold">{currencyFormatter.format(stats.sales)}</p>
        <p className="mt-2 text-sm text-white/70">
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
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/40">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
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
    <div className="rounded-2xl border border-[#a78bfa]/30 bg-gradient-to-br from-[#a78bfa]/20 to-transparent p-5 shadow-lg shadow-[#a78bfa]/20">
      <p className="text-xs uppercase tracking-[0.3em] text-[#c4b5fd]">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-[#c4b5fd]">{description}</p>
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

const buildProfitStats = (entries: Entry[], filters: FiltersState): ProfitStats => {
  const filtered = entries.filter(
    (entry) => entry.entry_date >= filters.start_date && entry.entry_date <= filters.end_date,
  );

  let sales = 0;
  let cogs = 0;
  let opex = 0;

  filtered.forEach((entry) => {
    switch (entry.entry_type) {
      case "Cash Inflow":
        if (entry.category === "Sales") {
          sales += entry.amount;
        }
        break;
      case "Cash Outflow":
        if (entry.category === "COGS") {
          cogs += entry.amount;
        } else if (entry.category === "Opex") {
          opex += entry.amount;
        }
        break;
      case "Credit":
        if (entry.category === "Sales") {
          sales += entry.amount;
        } else if (entry.category === "COGS") {
          cogs += entry.amount;
        } else if (entry.category === "Opex") {
          opex += entry.amount;
        }
        break;
      default:
        break;
    }
  });

  const grossProfit = sales - cogs;
  const netProfit = grossProfit - opex;

  return {
    sales,
    cogs,
    opex,
    grossProfit,
    netProfit,
    grossMargin: sales > 0 ? grossProfit / sales : NaN,
    netMargin: sales > 0 ? netProfit / sales : NaN,
  };
};
