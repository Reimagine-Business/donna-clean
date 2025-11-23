"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { markReminderDone } from "@/app/reminders/actions";
import { EditReminderDialog } from "./edit-reminder-dialog";

type FilterOption = "due_soon" | "overdue" | "completed";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  amount: number | null;
  status: string;
  category: string;
  frequency: string;
}

interface AlertsShellProps {
  initialReminders: Reminder[];
}

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
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'}`;
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

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "bills":
      return "📦";
    case "task":
      return "✓";
    case "advance_settlement":
      return "💸";
    case "others":
      return "📌";
    default:
      return "📌";
  }
};

export function AlertsShell({ initialReminders }: AlertsShellProps) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>("due_soon");
  const [isPending, startTransition] = useTransition();
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const filterOptions: { id: FilterOption; label: string }[] = [
    { id: "due_soon", label: "Due Soon" },
    { id: "overdue", label: "Overdue" },
    { id: "completed", label: "Completed" },
  ];

  // Filter reminders based on selected filter
  const filteredReminders = initialReminders.filter((reminder) => {
    const dueDate = new Date(reminder.due_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (activeFilter) {
      case "due_soon":
        return reminder.status === "pending" && diffDays >= 0 && diffDays <= 30;
      case "overdue":
        return reminder.status === "pending" && diffDays < 0;
      case "completed":
        return reminder.status === "completed";
      default:
        return true;
    }
  });

  const handleMarkDone = (reminderId: string) => {
    startTransition(async () => {
      await markReminderDone(reminderId);
    });
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    // The page will be revalidated by the server action
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Filter Dropdown */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Alerts & Reminders</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage your payment reminders and alerts
            </p>
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as FilterOption)}
              className="appearance-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 pr-10 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {filterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  📅 {option.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
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
                        {reminder.description && (
                          <p className="mt-1 text-sm text-slate-400">
                            {reminder.description}
                          </p>
                        )}
                        <p className="mt-2 text-sm font-medium text-slate-300">
                          Due: {formatDate(reminder.due_date)}
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
                          disabled={isPending}
                          className="rounded-md bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPending ? "Marking..." : "Mark Done"}
                        </button>
                        <button
                          onClick={() => handleEdit(reminder)}
                          disabled={isPending}
                          className="rounded-md bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <EditReminderDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingReminder(null);
        }}
        onSuccess={handleEditSuccess}
        reminder={editingReminder}
      />
    </>
  );
}
