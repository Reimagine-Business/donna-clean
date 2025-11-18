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
    [filters],
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

    channel = supabase
      .channel("public:entries")
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
      .subscribe();
    console.log("REAL-TIME SUBSCRIBED TO public:entries for user:", userId);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
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
            value={percentageFormatter(grossMargin)}
            subtitle="Gross profit ÷ sales"
          />
          <MetricCard
            title="Net Profit Margin"
            value={percentageFormatter(netMargin)}
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

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#a78bfa]/30 to-[#a78bfa]/10 p-6 text-white shadow-[0_0_35px_rgba(167,139,250,0.25)]">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">Total Sales</p>
          <p className="mt-4 text-4xl font-semibold">{currencyFormatter.format(sales)}</p>
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

const buildProfitStats = (entries: Entry[]) => {
  const sumMatching = (predicate: (entry: Entry) => boolean) =>
    entries.reduce((total, entry) => (predicate(entry) ? total + entry.amount : total), 0);

  const sales = sumMatching(
    (entry) => entry.category === "Sales" && entry.entry_type === "Cash Inflow",
  );
  const cogs = sumMatching(
    (entry) => entry.category === "COGS" && entry.entry_type === "Cash Outflow",
  );
  const opex = sumMatching(
    (entry) => entry.category === "Opex" && entry.entry_type === "Cash Outflow",
  );

  const grossProfit = sales - cogs;
  const netProfit = grossProfit - opex;
  const grossMargin = sales === 0 ? 0 : grossProfit / sales;
  const netMargin = sales === 0 ? 0 : netProfit / sales;

  return {
    sales,
    cogs,
    opex,
    grossProfit,
    netProfit,
    grossMargin,
    netMargin,
  };
};
