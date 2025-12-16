import { cn } from "@/lib/utils";

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg md:rounded-2xl border-2 border-purple-500/30 bg-purple-900/20 p-3 md:p-5 animate-pulse",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-purple-500/30 rounded w-24 md:w-32"></div>
          <div className="h-6 md:h-8 bg-purple-500/40 rounded w-28 md:w-40"></div>
        </div>
        <div className="h-8 md:h-10 bg-purple-500/40 rounded w-20 md:w-28"></div>
      </div>
    </div>
  );
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg md:rounded-2xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/40 to-purple-500/10 p-3 md:p-5 animate-pulse",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 md:h-4 md:w-4 bg-purple-500/50 rounded"></div>
          <div className="h-3 bg-purple-500/40 rounded w-24 md:w-32"></div>
        </div>
        <div className="h-6 md:h-8 bg-purple-500/50 rounded w-24 md:w-32"></div>
      </div>
    </div>
  );
}

export function SkeletonMetricCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg md:rounded-xl border border-border bg-card/60 p-3 md:p-4 animate-pulse",
        className
      )}
    >
      <div className="space-y-2">
        <div className="h-3 bg-purple-500/30 rounded w-20"></div>
        <div className="h-5 md:h-6 bg-purple-500/40 rounded w-24 md:w-28"></div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 md:space-y-3 animate-pulse">
      {/* Header */}
      <div className="h-8 md:h-10 bg-purple-500/20 rounded"></div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 md:h-14 bg-purple-500/20 rounded"></div>
      ))}
    </div>
  );
}

export function SkeletonPendingCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg md:rounded-2xl border border-border bg-card/40 p-3 md:p-5 animate-pulse",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-purple-500/30 rounded w-28"></div>
          <div className="h-6 md:h-7 bg-purple-500/40 rounded w-20"></div>
          <div className="h-3 bg-purple-500/30 rounded w-32"></div>
        </div>
        <div className="h-5 md:h-6 bg-purple-500/40 rounded w-20"></div>
      </div>
      <div className="space-y-2 md:space-y-3">
        <div className="h-12 md:h-14 bg-purple-500/20 rounded-lg"></div>
        <div className="h-12 md:h-14 bg-purple-500/20 rounded-lg"></div>
        <div className="h-12 md:h-14 bg-purple-500/20 rounded-lg"></div>
      </div>
    </div>
  );
}

export function SkeletonChartCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg md:rounded-2xl border border-border bg-card/40 p-3 md:p-5 animate-pulse",
        className
      )}
    >
      <div className="space-y-3 md:space-y-4">
        <div className="h-4 bg-purple-500/30 rounded w-32"></div>
        <div className="h-48 md:h-64 bg-purple-500/20 rounded"></div>
      </div>
    </div>
  );
}

// Full page skeleton for Cashpulse
export function CashpulseSkeletonLoading() {
  return (
    <div className="flex flex-col gap-4 md:gap-8 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-3">
        <div className="h-6 md:h-10 bg-purple-500/30 rounded w-48 md:w-64 animate-pulse"></div>
        <div className="h-4 bg-purple-500/20 rounded w-64 md:w-96 animate-pulse"></div>
      </div>

      {/* Stat Cards */}
      <section className="grid gap-2 md:gap-4 md:grid-cols-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </section>

      {/* Channel Cards */}
      <section className="grid gap-2 md:gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </section>

      {/* Pending Cards */}
      <section className="grid gap-3 md:gap-6 md:grid-cols-3">
        <SkeletonPendingCard />
        <SkeletonPendingCard />
        <SkeletonPendingCard />
      </section>

      {/* Settlement History */}
      <section className="rounded-xl md:rounded-3xl border border-border bg-card/40 p-3 md:p-6">
        <div className="h-6 md:h-8 bg-purple-500/30 rounded w-40 mb-4 animate-pulse"></div>
        <SkeletonTable rows={8} />
      </section>
    </div>
  );
}

// Full page skeleton for Profit Lens
export function ProfitLensSkeletonLoading() {
  return (
    <div className="flex flex-col gap-4 md:gap-8 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-3">
        <div className="h-6 md:h-10 bg-purple-500/30 rounded w-48 md:w-64 animate-pulse"></div>
        <div className="h-4 bg-purple-500/20 rounded w-64 md:w-96 animate-pulse"></div>
      </div>

      {/* P&L Statement */}
      <section className="rounded-xl md:rounded-3xl border border-border bg-card/40 p-4 md:p-6">
        <div className="h-6 bg-purple-500/30 rounded w-48 mb-4 animate-pulse"></div>
        <div className="space-y-3 md:space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 md:p-4 bg-purple-500/10 rounded-lg animate-pulse"
            >
              <div className="h-4 md:h-5 bg-purple-500/30 rounded w-32 md:w-40"></div>
              <div className="h-5 md:h-6 bg-purple-500/40 rounded w-24 md:w-32"></div>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
      </section>

      {/* Breakdown */}
      <section className="grid gap-3 md:gap-4 md:grid-cols-2">
        <SkeletonChartCard />
        <SkeletonChartCard />
      </section>
    </div>
  );
}
