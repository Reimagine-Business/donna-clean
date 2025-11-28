"use client";

import { useState } from "react";
import { AlertsShell } from "./alerts-shell";
import { AddReminderDialog } from "./add-reminder-dialog";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  category: string;
  frequency: string;
}

interface AlertsPageClientProps {
  initialReminders: Reminder[];
}

export function AlertsPageClient({ initialReminders }: AlertsPageClientProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddSuccess = () => {
    // The page will be revalidated by the server action
  };

  return (
    <>
      {/* Main Content */}
      <section className="px-4 pb-24 md:px-8 md:pb-8">
        <div className="mx-auto w-full max-w-6xl">
          <AlertsShell
            initialReminders={initialReminders}
            onAddClick={() => setIsAddDialogOpen(true)}
          />
        </div>
      </section>

      {/* Add Dialog */}
      <AddReminderDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </>
  );
}
