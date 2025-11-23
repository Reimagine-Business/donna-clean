"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { markReminderDone } from "@/app/reminders/actions";
import { EditReminderDialog } from "./edit-reminder-dialog";

type FilterOption = "all" | "due_soon" | "overdue" | "completed";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  category: string;
  frequency: string;
}

interface AlertsShellProps {
  initialReminders: Reminder[];
  onAddClick?: () => void;
}

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

export function AlertsShell({ initialReminders, onAddClick }: AlertsShellProps) {
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
      case "all":
        return true;
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Alerts & Reminders</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage your payment reminders and alerts
            </p>
          </div>

          {/* Add Button */}
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <span className="text-xl leading-none">+</span>
            <span>Add Reminder</span>
          </button>
        </div>

        {/* Tabs and Date Range Selector */}
        <div className="flex items-center justify-between">
          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                activeFilter === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter("due_soon")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                activeFilter === "due_soon"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              Due Soon
            </button>
            <button
              onClick={() => setActiveFilter("overdue")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                activeFilter === "overdue"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              Overdue
            </button>
            <button
              onClick={() => setActiveFilter("completed")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                activeFilter === "completed"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              Completed
            </button>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Date:</span>
            <select className="px-3 py-2 border border-slate-700 bg-slate-800 rounded-lg text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500">
              <option value="this-month">📅 This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="custom">Customize</option>
            </select>
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
