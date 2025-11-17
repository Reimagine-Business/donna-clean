"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Banknote, Activity } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Entry, normalizeEntry } from "@/lib/entries";
import { cn } from "@/lib/utils";
import { SettleEntryDialog } from "@/components/settlement/settle-entry-dialog";
import { Button } from "@/components/ui/button";

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

const getDateRange = (days: number): string[] => {
  const today = new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(format(subDays(today, i), "yyyy-MM-dd"));
  }
  return dates;
};

const getEffectiveCashDate = (entry: Entry): string => {
  if ((entry.entry_type === "Credit" || entry.entry_type === "Advance") && entry.settled) {
    return (entry.settled_at ?? entry.updated_at ?? entry.entry_date).slice(0, 10);
  }
  return entry.entry_date;
};

const isCashInflow = (entry: Entry) =>
  entry.entry_type === "Cash Inflow" ||
  (entry.entry_type === "Credit" && entry.settled) ||
  (entry.entry_type === "Advance" && entry.settled);

const isCashOutflow = (entry: Entry) => entry.entry_type === "Cash Outflow";

const isCashImpacting = (entry: Entry) => isCashInflow(entry) || isCashOutflow(entry);

const formatLabel = (date: string) => format(new Date(date), "dd MMM");

type CashTooltipProps = {
  active?: boolean;
  payload?: {
    dataKey: string;
    value: number;
    name: string;
  }[];
  label?: string;
};

const CashTooltip = ({ active, payload, label }: CashTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="flex items-center justify-between gap-4">
          <span className="capitalize text-slate-300">{item.name}</span>
          <span className="font-semibold text-white">
            {currencyFormatter.format(item.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
};

export function CashpulseShell({ initialEntries, userId }: CashpulseShellProps) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<Entry[]>(initialEntries.map(normalizeEntry));
  const [settlementEntry, setSettlementEntry] = useState<Entry | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("cashpulse-entries")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entries",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setEntries((prev) => {
            switch (payload.eventType) {
              case "INSERT": {
                const newEntry = normalizeEntry(payload.new);
                if (prev.some((e) => e.id === newEntry.id)) {
                  return prev.map((entry) => (entry.id === newEntry.id ? newEntry : entry));
                }
                return [newEntry, ...prev];
              }
              case "UPDATE": {
                const updated = normalizeEntry(payload.new);
                return prev.map((entry) => (entry.id === updated.id ? updated : entry));
              }
              case "DELETE": {
                const deletedId = (payload.old as Entry).id;
                return prev.filter((entry) => entry.id !== deletedId);
              }
              default:
                return prev;
            }
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const stats = useMemo(() => buildCashpulseStats(entries), [entries]);
  return (
    <div className="flex flex-col gap-8 text-white">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Donna · Cashpulse</p>
        <h1 className="text-3xl font-semibold">Real-time cash flow</h1>
        <p className="text-sm text-slate-400">
          Live signal across every inflow/outflow so you never fly blind.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Cash Inflow"
          value={currencyFormatter.format(stats.cashInflow)}
          subtitle="Includes settled credit & advance"
          variant="positive"
        />
        <StatCard
          title="Total Cash Outflow"
          value={currencyFormatter.format(stats.cashOutflow)}
          subtitle="Pure operating spend"
          variant="negative"
        />
        <StatCard
          title="Net Cash Flow"
          value={currencyFormatter.format(stats.netCashFlow)}
          subtitle="Inflow minus outflow"
          variant="neutral"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400">Daily trend</p>
              <h2 className="text-lg font-semibold">Inflow vs Outflow (30 days)</h2>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={stats.lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CashTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="inflow"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  name="Inflow"
                />
                <Line
                  type="monotone"
                  dataKey="outflow"
                  stroke="#f87171"
                  strokeWidth={2}
                  dot={false}
                  name="Outflow"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Banknote className="h-5 w-5 text-[#a78bfa]" />
            <div>
              <p className="text-xs uppercase text-slate-400">Channels</p>
              <h2 className="text-lg font-semibold">Cash vs Bank</h2>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={stats.cashVsBank}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="method" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  content={<CashTooltip />}
                  formatter={(value: number) => currencyFormatter.format(value ?? 0)}
                />
                <Bar dataKey="value" fill="#a78bfa" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
        <div className="mb-4 flex items-center gap-3">
          <Activity className="h-5 w-5 text-emerald-300" />
          <div>
            <p className="text-xs uppercase text-slate-400">Stability</p>
            <h2 className="text-lg font-semibold">Running cash balance</h2>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={stats.balanceData}>
              <defs>
                <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip content={<CashTooltip />} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#a78bfa"
                strokeWidth={2}
                fill="url(#balanceFill)"
                name="Balance"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <PendingCard
          title="Pending Collections"
          description="Credit entries awaiting cash"
          info={stats.pendingCollections}
          accent="emerald"
          onSettle={setSettlementEntry}
        />
        <PendingCard
          title="Pending Bills"
          description="Advance entries yet to settle"
          info={stats.pendingBills}
          accent="rose"
          onSettle={setSettlementEntry}
        />
      </section>
      <SettleEntryDialog entry={settlementEntry} onClose={() => setSettlementEntry(null)} />
    </div>
  );
}

type CashpulseStats = {
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  cashVsBank: { method: string; value: number }[];
  lineData: { date: string; label: string; inflow: number; outflow: number }[];
  balanceData: { date: string; label: string; balance: number }[];
  pendingCollections: PendingList;
  pendingBills: PendingList;
};

type PendingList = {
  count: number;
  total: number;
  entries: Entry[];
};

const buildCashpulseStats = (entries: Entry[]): CashpulseStats => {
  const last30Days = getDateRange(30);

  const cashInflow = entries.reduce(
    (sum, entry) => sum + (isCashInflow(entry) ? entry.amount : 0),
    0,
  );
  const cashOutflow = entries.reduce(
    (sum, entry) => sum + (isCashOutflow(entry) ? entry.amount : 0),
    0,
  );

  const lineData = last30Days.map((date) => {
    const inflow = entries.reduce((sum, entry) => {
      if (isCashInflow(entry) && getEffectiveCashDate(entry) === date) {
        return sum + entry.amount;
      }
      return sum;
    }, 0);

    const outflow = entries.reduce((sum, entry) => {
      if (isCashOutflow(entry) && getEffectiveCashDate(entry) === date) {
        return sum + entry.amount;
      }
      return sum;
    }, 0);

    return {
      date,
      label: formatLabel(date),
      inflow,
      outflow,
    };
  });

  let running = 0;
  const balanceData = lineData.map((day) => {
    running += day.inflow - day.outflow;
    return {
      ...day,
      balance: running,
    };
  });

  const cashVsBankMap: Record<string, number> = {
    Cash: 0,
    Bank: 0,
  };

  entries.forEach((entry) => {
    if (isCashImpacting(entry)) {
      cashVsBankMap[entry.payment_method] += entry.amount;
    }
  });

  const pendingCollectionsEntries = entries.filter(
    (entry) => entry.entry_type === "Credit" && !entry.settled,
  );
  const pendingBillsEntries = entries.filter(
    (entry) => entry.entry_type === "Advance" && !entry.settled,
  );

  return {
    cashInflow,
    cashOutflow,
    netCashFlow: cashInflow - cashOutflow,
    cashVsBank: Object.entries(cashVsBankMap).map(([method, value]) => ({
      method,
      value,
    })),
    lineData,
    balanceData,
    pendingCollections: {
      count: pendingCollectionsEntries.length,
      total: pendingCollectionsEntries.reduce((sum, entry) => sum + entry.amount, 0),
      entries: pendingCollectionsEntries,
    },
    pendingBills: {
      count: pendingBillsEntries.length,
      total: pendingBillsEntries.reduce((sum, entry) => sum + entry.amount, 0),
      entries: pendingBillsEntries,
    },
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
    neutral: "from-[#a78bfa]/40 to-[#a78bfa]/5 border-[#a78bfa]/40",
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
        "rounded-2xl border bg-gradient-to-br p-5 shadow-xl shadow-black/40",
        colorMap[variant],
      )}
    >
      <div className="mb-4 flex items-center justify-between text-sm uppercase tracking-widest text-white/70">
        <span>{title}</span>
        <Icon className="h-4 w-4 text-white/70" />
      </div>
      <p className="text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-white/70">{subtitle}</p>
    </div>
  );
}

type PendingCardProps = {
  title: string;
  description: string;
  info: PendingList;
  accent: "emerald" | "rose";
  onSettle: (entry: Entry) => void;
};

function PendingCard({ title, description, info, accent, onSettle }: PendingCardProps) {
  const accentColor = accent === "emerald" ? "text-emerald-300" : "text-rose-300";
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
      <p className={cn("text-xs uppercase tracking-widest", accentColor)}>{title}</p>
      <h3 className="mt-2 text-2xl font-semibold text-white">
        {numberFormatter.format(info.count)}{" "}
        <span className="text-base font-normal text-slate-400">open</span>
      </h3>
      <p className="text-sm text-slate-400">{description}</p>
      <p className="mt-4 text-lg font-semibold text-white">
        {currencyFormatter.format(info.total)}
      </p>
      <div className="mt-4 space-y-3">
          {info.entries.length === 0 && (
            <p className="text-sm text-slate-500">All settled. You&apos;re in control.</p>
          )}
        {info.entries.slice(0, 3).map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-white">
                ₹{entry.amount.toLocaleString("en-IN")}{" "}
                <span className="text-xs uppercase text-slate-400">{entry.category}</span>
              </p>
              <p className="text-xs text-slate-500">{formatLabel(entry.entry_date)}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-[#a78bfa]/40 text-[#a78bfa] hover:text-white"
              onClick={() => onSettle(entry)}
            >
              Settle
            </Button>
          </div>
        ))}
        {info.entries.length > 3 && (
          <p className="text-xs text-slate-500">
            +{info.entries.length - 3} more waiting. Use Daily Entries to manage all.
          </p>
        )}
      </div>
    </div>
  );
}
