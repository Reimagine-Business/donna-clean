"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { markReminderDone } from "@/app/reminders/actions";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  category: string;
}

interface HomeShellProps {
  initialReminders: Reminder[];
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Due today";
  } else if (diffDays === 1) {
    return "Due tomorrow";
  } else {
    return `Due in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  }
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

export function HomeShell({ initialReminders }: HomeShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter for Due Soon (next 7 days, pending only)
  const dueSoonReminders = initialReminders.filter((reminder) => {
    if (reminder.status !== "pending") return false;

    const dueDate = new Date(reminder.due_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= 7;
  });

  const handleMarkDone = (reminderId: string) => {
    startTransition(async () => {
      await markReminderDone(reminderId);
    });
  };

  const handleViewAll = () => {
    router.push("/alerts");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mt-2 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Home
        </h1>
      </div>

      {/* Due Soon Section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Due Soon (Next 7 Days)
          </h2>
          <button
            onClick={handleViewAll}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            View All →
          </button>
        </div>

        <div className="space-y-3">
          {dueSoonReminders.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-card/50 p-8 text-center">
              <p className="text-muted-foreground">No upcoming reminders</p>
              <button
                onClick={handleViewAll}
                className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Go to Alerts →
              </button>
            </div>
          ) : (
            dueSoonReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="rounded-lg border border-border bg-card/50 p-4 transition-colors hover:bg-card"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {getCategoryIcon(reminder.category)}
                  </span>
                  <div className="flex-1">
                    <div>
                      <h3 className="font-semibold text-white">
                        {reminder.title}
                      </h3>
                      {reminder.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {reminder.description}
                        </p>
                      )}
                      <p className="mt-2 text-sm font-medium text-yellow-400">
                        {formatDate(reminder.due_date)}
                      </p>
                    </div>

                    {/* Mark Done Button */}
                    <div className="mt-4">
                      <button
                        onClick={() => handleMarkDone(reminder.id)}
                        disabled={isPending}
                        className="rounded-md bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPending ? "Marking..." : "Mark Done"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
