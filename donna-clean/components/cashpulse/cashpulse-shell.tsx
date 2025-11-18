"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, subDays } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Activity } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createBrowserClient } from "@/lib/supabase/client";
import { Entry, normalizeEntry } from "@/lib/entries";
import { cn } from "@/lib/utils";
import { SettleEntryDialog } from "@/components/settlement/settle-entry-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

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

const getCashDate = (entry: Entry) => {
  if ((entry.entry_type === "Credit" || entry.entry_type === "Advance") && entry.settled) {
    return (entry.settled_at ?? entry.entry_date).slice(0, 10);
  }
  return entry.entry_date;
};

const ENTRY_SELECT =
  "id, user_id, entry_type, category, payment_method, amount, entry_date, notes, image_url, settled, settled_at, created_at, updated_at";

export function CashpulseShell({ initialEntries, userId }: CashpulseShellProps) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [entries, setEntries] = useState<Entry[]>(initialEntries.map(normalizeEntry));
  const [settlementEntry, setSettlementEntry] = useState<Entry | null>(null);
  const [historyFilters, setHistoryFilters] = useState({
    start_date: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
  });

  const initialStatsRef = useRef<CashpulseStats | null>(null);
  if (!initialStatsRef.current) {
    initialStatsRef.current = buildCashpulseStats(initialEntries, historyFilters);
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
  const [realtimeUserId, setRealtimeUserId] = useState<string | null>(userId ?? null);

  useEffect(() => {
    console.log("Cashpulse is now CLIENT — real-time will work");
  }, []);

  const recalcKpis = useCallback(
    (nextEntries: Entry[], nextFilters = historyFilters) => {
      const updatedStats = buildCashpulseStats(nextEntries, nextFilters);
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
    [historyFilters],
  );

  const refetchEntries = useCallback(async () => {
    const targetUserId = realtimeUserId ?? userId;
    if (!targetUserId) {
      console.error("Cannot refetch entries: missing user id");
      return undefined;
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
      skipNextRecalc.current = true;
      setEntries(nextEntries);
      return nextEntries;
    } catch (error) {
      console.error("Failed to refetch entries for Cashpulse", error);
      return undefined;
    }
  }, [realtimeUserId, supabase, userId]);

  useEffect(() => {
    let isMounted = true;
    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      const targetUserId = realtimeUserId ?? userId;

      if (!targetUserId) {
        const { data, error } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (error) {
          console.error("Failed to fetch auth user for realtime (Cashpulse)", error);
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
          async (payload) => {
            console.log("REAL-TIME: payload received", payload);
            const latestEntries = await refetchEntries();
            if (!latestEntries) {
              return;
            }
            console.log("REAL-TIME: refetch complete – entries count:", latestEntries.length);
            const updatedStats = recalcKpis(latestEntries);
            const realtimeSales = updatedStats.cashBreakdown
              .filter((channelBreakdown) => channelBreakdown.method === "Cash" || channelBreakdown.method === "Bank")
              .reduce((sum, channelBreakdown) => sum + channelBreakdown.value, 0);
            console.log(
              "REAL-TIME: KPIs recalculated → inflow:",
              updatedStats.cashInflow,
              "sales:",
              realtimeSales,
            );
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
  }, [realtimeUserId, recalcKpis, refetchEntries, supabase, userId]);

  useEffect(() => {
    if (skipNextRecalc.current) {
      skipNextRecalc.current = false;
      return;
    }
    recalcKpis(entries, historyFilters);
  }, [entries, historyFilters, recalcKpis]);
  const historyLabel = `${format(new Date(historyFilters.start_date), "dd MMM yyyy")} – ${format(
    new Date(historyFilters.end_date),
    "dd MMM yyyy",
  )}`;

  const handleExportHistory = () => {
    if (!history.length) return;
    const headers = [
      "Date",
      "Entry Type",
      "Category",
      "Amount",
      "Payment Method",
      "Notes",
    ];
    const rows = history.map((entry) => [
      entry.entry_date,
      entry.entry_type,
      entry.category,
      entry.amount.toString(),
      entry.payment_method,
      entry.notes?.replace(/"/g, '""') ?? "",
    ]);
    const csvContent = [headers, ...rows]
      .map((line) => line.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cashpulse-settlement-history-${historyFilters.end_date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-8 text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Donna · Cashpulse</p>
          <h1 className="text-4xl font-semibold">Cashpulse</h1>
          <p className="text-sm text-slate-400">Accrual basis for {historyLabel}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-400">From</p>
            <Input
              type="date"
              value={historyFilters.start_date}
              max={historyFilters.end_date}
              onChange={(event) =>
                setHistoryFilters((prev) => ({ ...prev, start_date: event.target.value }))
              }
              className="border-white/10 bg-slate-950/80 text-white"
            />
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">To</p>
            <Input
              type="date"
              value={historyFilters.end_date}
              min={historyFilters.start_date}
              onChange={(event) =>
                setHistoryFilters((prev) => ({ ...prev, end_date: event.target.value }))
              }
              className="border-white/10 bg-slate-950/80 text-white"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            className="text-slate-300 hover:text-white"
            onClick={() =>
              setHistoryFilters({
                start_date: format(subDays(new Date(), 30), "yyyy-MM-dd"),
                end_date: format(new Date(), "yyyy-MM-dd"),
              })
            }
          >
            Last 30 days
          </Button>
        </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Total Cash Inflow"
            value={currencyFormatter.format(inflow)}
            subtitle={historyLabel}
            variant="positive"
          />
          <StatCard
            title="Total Cash Outflow"
            value={currencyFormatter.format(outflow)}
            subtitle={historyLabel}
            variant="negative"
          />
          <StatCard
            title="Net Cash Flow"
            value={currencyFormatter.format(net)}
            subtitle={historyLabel}
            variant="neutral"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {cashBreakdown.map((channel) => (
            <ChannelCard
              key={channel.method}
              method={channel.method}
              value={currencyFormatter.format(channel.value)}
            />
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <PendingCard
            title="Pending Collections"
            description="Credit sales awaiting payment."
            info={pendingCollections}
            accent="emerald"
            onSettle={setSettlementEntry}
          />
          <PendingCard
            title="Pending Bills"
            description="Credit purchases awaiting payment."
            info={pendingBills}
            accent="rose"
            onSettle={setSettlementEntry}
          />
          <PendingCard
            title="Advances"
            description="Advance payments to be settled."
            info={pendingAdvances}
            accent="purple"
            onSettle={setSettlementEntry}
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl shadow-black/40">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Settlement History</p>
              <h2 className="text-2xl font-semibold text-white">Cash vs profit reconciled</h2>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-[#a78bfa]/50 text-[#a78bfa]"
              disabled={!history.length}
              onClick={handleExportHistory}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-slate-400">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Entry Type</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Payment Method</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      No settlements in this range.
                    </td>
                  </tr>
                ) : (
                  history.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-t border-white/5 bg-white/5 text-slate-100 transition hover:bg-white/10"
                    >
                      <td className="px-3 py-3 font-medium">
                        {format(new Date(entry.settled_at ?? entry.entry_date), "dd MMM yyyy")}
                      </td>
                      <td className="px-3 py-3">{entry.entry_type}</td>
                      <td className="px-3 py-3">{entry.category}</td>
                      <td className="px-3 py-3 font-semibold text-white">
                        {currencyFormatter.format(entry.amount)}
                      </td>
                      <td className="px-3 py-3">{entry.payment_method}</td>
                      <td className="px-3 py-3 max-w-[220px] truncate">{entry.notes ?? "—"}</td>
                      <td className="px-3 py-3 text-right text-xs uppercase tracking-[0.2em] text-emerald-300">
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

const buildCashpulseStats = (
  entries: Entry[],
  filters: { start_date: string; end_date: string },
): CashpulseStats => {
  const rangeEntries = entries.filter((entry) =>
    isWithinRange(getCashDate(entry), filters.start_date, filters.end_date),
  );

  let cashInflow = 0;
  let cashOutflow = 0;
  const cashBreakdownMap: Record<string, number> = {
    Cash: 0,
    Bank: 0,
  };

  const applyInflow = (entry: Entry) => {
    cashInflow += entry.amount;
    cashBreakdownMap[entry.payment_method] =
      (cashBreakdownMap[entry.payment_method] ?? 0) + entry.amount;
  };

  const applyOutflow = (entry: Entry) => {
    cashOutflow += entry.amount;
    cashBreakdownMap[entry.payment_method] =
      (cashBreakdownMap[entry.payment_method] ?? 0) - entry.amount;
  };

  rangeEntries.forEach((entry) => {
    switch (entry.entry_type) {
      case "Cash Inflow":
        if (entry.category === "Sales") {
          applyInflow(entry);
        }
        break;
      case "Cash Outflow":
        applyOutflow(entry);
        break;
      case "Advance":
        if (entry.category === "Sales") {
          applyInflow(entry);
        } else {
          applyOutflow(entry);
        }
        break;
      default:
        break;
    }
  });

  const pendingCredit = entries.filter((entry) => entry.entry_type === "Credit" && !entry.settled);
  const pendingCollectionsEntries = pendingCredit.filter((entry) => entry.category === "Sales");
  const pendingBillsEntries = pendingCredit.filter((entry) => entry.category !== "Sales");
  const pendingAdvancesEntries = entries.filter(
    (entry) => entry.entry_type === "Advance" && !entry.settled,
  );

  const history = entries
    .filter(
      (entry) =>
        (entry.entry_type === "Credit" || entry.entry_type === "Advance") && entry.settled,
    )
    .filter((entry) =>
      isWithinRange(entry.settled_at ?? entry.entry_date, filters.start_date, filters.end_date),
    )
    .sort(
      (a, b) =>
        new Date(b.settled_at ?? b.entry_date).getTime() -
        new Date(a.settled_at ?? a.entry_date).getTime(),
    );

  return {
    cashInflow,
    cashOutflow,
    netCashFlow: cashInflow - cashOutflow,
    cashBreakdown: Object.entries(cashBreakdownMap).map(([method, value]) => ({
      method,
      value,
    })),
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
    pendingAdvances: {
      count: pendingAdvancesEntries.length,
      total: pendingAdvancesEntries.reduce((sum, entry) => sum + entry.amount, 0),
      entries: pendingAdvancesEntries,
    },
    history,
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

type ChannelCardProps = {
  method: string;
  value: string;
};

function ChannelCard({ method, value }: ChannelCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Channel</p>
      <p className="mt-2 text-lg font-semibold text-white">{method}</p>
      <p className={cn("mt-3 text-2xl font-semibold", value.startsWith("-") ? "text-rose-300" : "text-[#a78bfa]")}>
        {value}
      </p>
    </div>
  );
}

type PendingCardProps = {
  title: string;
  description: string;
  info: PendingList;
  accent: "emerald" | "rose" | "purple";
  onSettle: (entry: Entry) => void;
};

const accentText: Record<PendingCardProps["accent"], string> = {
  emerald: "text-emerald-300",
  rose: "text-rose-300",
  purple: "text-[#a78bfa]",
};

function PendingCard({ title, description, info, accent, onSettle }: PendingCardProps) {
  const accentColor = accentText[accent];
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
                <p className="text-xs text-slate-500">
                  {formatDisplayDate(entry.entry_date)}
                </p>
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
