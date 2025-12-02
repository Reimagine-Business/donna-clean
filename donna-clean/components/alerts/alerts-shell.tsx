"use client";

import { useState, useTransition, useMemo } from "react";
import { cn } from "@/lib/utils";
import { markReminderDone } from "@/app/reminders/actions";
import { EditReminderDialog } from "./edit-reminder-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { filterByDateRange, filterByCustomDateRange, type DateRange } from "@/lib/date-utils";

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
  const [dateFilter, setDateFilter] = useState("this-month");
  const [showCustomDatePickers, setShowCustomDatePickers] = useState(false);
  const [customFromDate, setCustomFromDate] = useState<Date>();
  const [customToDate, setCustomToDate] = useState<Date>();
  const [editingId, setEditingId] = useState<string | null>(null); // Track which reminder is being edited

  // Filter reminders based on date range AND status filter
  const filteredReminders = useMemo(() => {
    // First, filter by date range
    let dateFiltered: Reminder[];
    if (dateFilter === "customize" && customFromDate && customToDate) {
      dateFiltered = filterByCustomDateRange(initialReminders, customFromDate, customToDate, "due_date");
    } else if (dateFilter !== "customize") {
      dateFiltered = filterByDateRange(initialReminders, dateFilter as DateRange, "due_date");
    } else {
      dateFiltered = initialReminders;
    }

    // Then, filter by status
    return dateFiltered.filter((reminder) => {
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
  }, [initialReminders, dateFilter, activeFilter, customFromDate, customToDate]);

  const handleMarkDone = (reminderId: string) => {
    startTransition(async () => {
      await markReminderDone(reminderId);
    });
  };

  const handleEdit = (reminder: Reminder) => {
    // Prevent double-clicks by checking if already editing
    if (editingId) return;

    setEditingId(reminder.id);
    setEditingReminder(reminder);
    setIsEditDialogOpen(true);

    // Clear loading state after dialog opens (instant for modal)
    setTimeout(() => setEditingId(null), 100);
  };

  const handleEditSuccess = () => {
    // The page will be revalidated by the server action
  };

  return (
    <>
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex items-center justify-between mt-2 mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Need your Attention
          </h1>

          {/* Add Button */}
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 md:px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <span className="text-xl leading-none">+</span>
            <span className="hidden sm:inline">Add Reminder</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Tabs and Date Range Selector */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={cn(
                "px-2 md:px-4 py-1 md:py-2 rounded-lg font-medium text-[10px] md:text-sm transition-colors",
                activeFilter === "all"
                  ? "bg-primary text-white"
                  : "bg-secondary text-foreground/70 hover:bg-primary/80"
              )}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter("due_soon")}
              className={cn(
                "px-2 md:px-4 py-1 md:py-2 rounded-lg font-medium text-[10px] md:text-sm transition-colors",
                activeFilter === "due_soon"
                  ? "bg-primary text-white"
                  : "bg-secondary text-foreground/70 hover:bg-primary/80"
              )}
            >
              Due Soon
            </button>
            <button
              onClick={() => setActiveFilter("overdue")}
              className={cn(
                "px-2 md:px-4 py-1 md:py-2 rounded-lg font-medium text-[10px] md:text-sm transition-colors",
                activeFilter === "overdue"
                  ? "bg-primary text-white"
                  : "bg-secondary text-foreground/70 hover:bg-primary/80"
              )}
            >
              Overdue
            </button>
            <button
              onClick={() => setActiveFilter("completed")}
              className={cn(
                "px-2 md:px-4 py-1 md:py-2 rounded-lg font-medium text-[10px] md:text-sm transition-colors",
                activeFilter === "completed"
                  ? "bg-primary text-white"
                  : "bg-secondary text-foreground/70 hover:bg-primary/80"
              )}
            >
              Completed
            </button>
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
              <option value="last-year">Last Year</option>
              <option value="all-time">All Time</option>
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

        {/* Reminders List */}
        <div className="space-y-2 md:space-y-3">
          {filteredReminders.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-card/50 p-4 md:p-8 text-center">
              <p className="text-xs md:text-sm text-muted-foreground">No reminders found</p>
            </div>
          ) : (
            filteredReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={cn(
                  "rounded-lg border bg-card/50 p-2 md:p-4 transition-colors hover:bg-card",
                  reminder.status === "completed"
                    ? "border-slate-800 opacity-60"
                    : "border-border"
                )}
              >
                <div className="flex items-start gap-2 md:gap-3">
                  <span className="text-base md:text-2xl" aria-hidden="true">
                    {getCategoryIcon(reminder.category)}
                  </span>
                  <div className="flex-1">
                    <div>
                      <h3
                        className={cn(
                          "font-semibold text-sm md:text-base",
                          reminder.status === "completed"
                            ? "text-muted-foreground line-through"
                            : "text-white"
                        )}
                      >
                        {reminder.title}
                      </h3>
                      {reminder.description && (
                        <p className="mt-0.5 md:mt-1 text-[10px] md:text-sm text-muted-foreground">
                          {reminder.description}
                        </p>
                      )}
                      <p className="mt-1 md:mt-2 text-[10px] md:text-sm font-medium text-foreground/70">
                        Due: {formatDate(reminder.due_date)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    {reminder.status !== "completed" && (
                      <div className="mt-2 md:mt-4 flex flex-wrap gap-1.5 md:gap-2">
                        <button
                          onClick={() => handleMarkDone(reminder.id)}
                          disabled={isPending}
                          className="rounded-md bg-green-500/10 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPending ? "Marking..." : "Mark Done"}
                        </button>
                        <button
                          onClick={() => handleEdit(reminder)}
                          disabled={isPending || editingId === reminder.id}
                          className="rounded-md bg-blue-500/10 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {editingId === reminder.id ? (
                            <>
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="hidden md:inline">Opening...</span>
                            </>
                          ) : (
                            "Edit"
                          )}
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
