"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface AlertSummary {
  title: string;
  count: number;
  amount: number;
  color: "red" | "yellow" | "blue";
  icon: string;
}

const mockAlertSummaries: AlertSummary[] = [
  {
    title: "Overdue",
    count: 3,
    amount: 45000,
    color: "red",
    icon: "🚨",
  },
  {
    title: "Due This Week",
    count: 5,
    amount: 78500,
    color: "yellow",
    icon: "⏰",
  },
  {
    title: "Collections Aging",
    count: 8,
    amount: 125000,
    color: "blue",
    icon: "💼",
  },
  {
    title: "Bills Aging",
    count: 4,
    amount: 62000,
    color: "blue",
    icon: "📄",
  },
  {
    title: "Advances Aging",
    count: 2,
    amount: 35000,
    color: "blue",
    icon: "💸",
  },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getColorClasses = (color: "red" | "yellow" | "blue") => {
  switch (color) {
    case "red":
      return {
        bg: "bg-red-500/10 hover:bg-red-500/20",
        border: "border-red-500/30",
        text: "text-red-400",
      };
    case "yellow":
      return {
        bg: "bg-yellow-500/10 hover:bg-yellow-500/20",
        border: "border-yellow-500/30",
        text: "text-yellow-400",
      };
    case "blue":
      return {
        bg: "bg-blue-500/10 hover:bg-blue-500/20",
        border: "border-blue-500/30",
        text: "text-blue-400",
      };
  }
};

export function HomeShell() {
  const router = useRouter();

  const handleCardClick = () => {
    router.push("/alerts");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Overview of your alerts and reminders
        </p>
      </div>

      {/* Overdue Alerts Section */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Overdue Alerts
        </h2>
        <div className="space-y-3">
          {mockAlertSummaries
            .filter((alert) => alert.color === "red")
            .map((alert) => {
              const colors = getColorClasses(alert.color);
              return (
                <button
                  key={alert.title}
                  onClick={handleCardClick}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition-colors",
                    colors.bg,
                    colors.border
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" aria-hidden="true">
                        {alert.icon}
                      </span>
                      <div>
                        <h3 className="font-semibold text-white">
                          {alert.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {alert.count} {alert.count === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-semibold", colors.text)}>
                        {formatCurrency(alert.amount)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </section>

      {/* This Week Section */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          This Week
        </h2>
        <div className="space-y-3">
          {mockAlertSummaries
            .filter((alert) => alert.color === "yellow")
            .map((alert) => {
              const colors = getColorClasses(alert.color);
              return (
                <button
                  key={alert.title}
                  onClick={handleCardClick}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition-colors",
                    colors.bg,
                    colors.border
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" aria-hidden="true">
                        {alert.icon}
                      </span>
                      <div>
                        <h3 className="font-semibold text-white">
                          {alert.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {alert.count} {alert.count === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-semibold", colors.text)}>
                        {formatCurrency(alert.amount)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </section>

      {/* Aging Items Section */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Aging Items
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {mockAlertSummaries
            .filter((alert) => alert.color === "blue")
            .map((alert) => {
              const colors = getColorClasses(alert.color);
              return (
                <button
                  key={alert.title}
                  onClick={handleCardClick}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    colors.bg,
                    colors.border
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-2xl" aria-hidden="true">
                      {alert.icon}
                    </span>
                    <h3 className="text-sm font-semibold text-white">
                      {alert.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {alert.count} {alert.count === 1 ? "item" : "items"}
                    </p>
                    <p className={cn("text-base font-semibold", colors.text)}>
                      {formatCurrency(alert.amount)}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>
      </section>
    </div>
  );
}
