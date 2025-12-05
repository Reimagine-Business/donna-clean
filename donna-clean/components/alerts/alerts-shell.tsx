"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "overdue" | "due-soon" | "upcoming" | "completed";

interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  amount?: number;
  status: "overdue" | "due-soon" | "upcoming" | "completed";
  category: "collection" | "bill" | "advance" | "other";
}

interface AlertsShellProps {
  initialReminders?: any[]; // Accept any reminder format for now
  onAddClick?: () => void;
}

const mockReminders: Reminder[] = [
  {
    id: "1",
    title: "Invoice #1234 - Acme Corp",
    description: "Payment collection due",
    dueDate: "2025-11-15",
    amount: 25000,
    status: "overdue",
    category: "collection",
  },
  {
    id: "2",
    title: "Invoice #1235 - Tech Solutions",
    description: "Payment collection due",
    dueDate: "2025-11-18",
    amount: 15000,
    status: "overdue",
    category: "collection",
  },
  {
    id: "3",
    title: "Electricity Bill",
    description: "Monthly electricity payment",
    dueDate: "2025-11-20",
    amount: 5000,
    status: "overdue",
    category: "bill",
  },
  {
    id: "4",
    title: "Rent Payment",
    description: "Office rent for December",
    dueDate: "2025-11-25",
    amount: 30000,
    status: "due-soon",
    category: "bill",
  },
  {
    id: "5",
    title: "Staff Advance - Rahul",
    description: "Recovery due",
    dueDate: "2025-11-26",
    amount: 10000,
    status: "due-soon",
    category: "advance",
  },
  {
    id: "6",
    title: "Invoice #1236 - Global Inc",
    description: "Payment collection",
    dueDate: "2025-11-28",
    amount: 45000,
    status: "due-soon",
    category: "collection",
  },
  {
    id: "7",
    title: "GST Filing",
    description: "Quarterly GST return",
    dueDate: "2025-12-05",
    amount: undefined,
    status: "upcoming",
    category: "other",
  },
  {
    id: "8",
    title: "Invoice #1233 - Start Corp",
    description: "Payment received",
    dueDate: "2025-11-10",
    amount: 20000,
    status: "completed",
    category: "collection",
  },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === 0) {
    return "Due today";
  } else if (diffDays === 1) {
    return "Due tomorrow";
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getStatusColor = (status: Reminder["status"]) => {
  switch (status) {
    case "overdue":
      return "text-red-400";
    case "due-soon":
      return "text-yellow-400";
    case "upcoming":
      return "text-blue-400";
    case "completed":
      return "text-green-400";
  }
};

const getCategoryIcon = (category: Reminder["category"]) => {
  switch (category) {
    case "collection":
      return "💼";
    case "bill":
      return "📄";
    case "advance":
      return "💸";
    case "other":
      return "📌";
  }
};

export function AlertsShell({ initialReminders, onAddClick }: AlertsShellProps = {}) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "overdue", label: "Overdue" },
    { id: "due-soon", label: "Due Soon" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
  ];

  const filteredReminders = mockReminders.filter((reminder) => {
    if (activeFilter === "all") return true;
    return reminder.status === activeFilter;
  });

  const handleMarkDone = (id: string) => {
    console.log("Mark done:", id);
    // TODO: Implement mark done functionality
  };

  const handleEdit = (id: string) => {
    console.log("Edit:", id);
    // TODO: Implement edit functionality
  };

  const handleSnooze = (id: string) => {
    console.log("Snooze:", id);
    // TODO: Implement snooze functionality
  };

  const agingSummary = {
    collections: {
      count: mockReminders.filter((r) => r.category === "collection" && r.status !== "completed").length,
      amount: mockReminders
        .filter((r) => r.category === "collection" && r.status !== "completed")
        .reduce((sum, r) => sum + (r.amount || 0), 0),
    },
    bills: {
      count: mockReminders.filter((r) => r.category === "bill" && r.status !== "completed").length,
      amount: mockReminders
        .filter((r) => r.category === "bill" && r.status !== "completed")
        .reduce((sum, r) => sum + (r.amount || 0), 0),
    },
    advances: {
      count: mockReminders.filter((r) => r.category === "advance" && r.status !== "completed").length,
      amount: mockReminders
        .filter((r) => r.category === "advance" && r.status !== "completed")
        .reduce((sum, r) => sum + (r.amount || 0), 0),
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Alerts & Reminders</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your payment reminders and alerts
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeFilter === tab.id
                ? "bg-[#a78bfa] text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {filteredReminders.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400">No reminders found</p>
          </div>
        ) : (
          filteredReminders.map((reminder) => (
            <div
              key={reminder.id}
              className={cn(
                "rounded-lg border bg-slate-900/50 p-4 transition-colors hover:bg-slate-900",
                reminder.status === "completed"
                  ? "border-slate-800 opacity-60"
                  : "border-slate-700"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {getCategoryIcon(reminder.category)}
                </span>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3
                        className={cn(
                          "font-semibold",
                          reminder.status === "completed"
                            ? "text-slate-500 line-through"
                            : "text-white"
                        )}
                      >
                        {reminder.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {reminder.description}
                      </p>
                      <p
                        className={cn(
                          "mt-2 text-sm font-medium",
                          getStatusColor(reminder.status)
                        )}
                      >
                        {formatDate(reminder.dueDate)}
                      </p>
                    </div>
                    {reminder.amount && (
                      <div className="text-right">
                        <p className="text-lg font-semibold text-white">
                          {formatCurrency(reminder.amount)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {reminder.status !== "completed" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleMarkDone(reminder.id)}
                        className="rounded-md bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20"
                      >
                        Mark Done
                      </button>
                      <button
                        onClick={() => handleEdit(reminder.id)}
                        className="rounded-md bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleSnooze(reminder.id)}
                        className="rounded-md bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20"
                      >
                        Snooze
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Aging Summary */}
      <section className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Aging Summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-400">Collections</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {agingSummary.collections.count}
            </p>
            <p className="mt-1 text-sm font-medium text-blue-400">
              {formatCurrency(agingSummary.collections.amount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Bills</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {agingSummary.bills.count}
            </p>
            <p className="mt-1 text-sm font-medium text-yellow-400">
              {formatCurrency(agingSummary.bills.amount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Advances</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {agingSummary.advances.count}
            </p>
            <p className="mt-1 text-sm font-medium text-purple-400">
              {formatCurrency(agingSummary.advances.amount)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
