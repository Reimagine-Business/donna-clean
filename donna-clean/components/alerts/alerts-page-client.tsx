"use client";

import { useState } from "react";
import { AlertsShell } from "./alerts-shell";
import { AddReminderDialog } from "./add-reminder-dialog";

interface AlertsPageClientProps {
  initialReminders: any[];
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
