"use client";

import { useState } from "react";
import { HamburgerMenu } from "@/components/navigation/hamburger-menu";
import { AlertsShell } from "./alerts-shell";
import { AddReminderDialog } from "./add-reminder-dialog";

interface AlertsPageClientProps {
  userEmail: string;
  initialReminders: any[];
}

export function AlertsPageClient({ userEmail, initialReminders }: AlertsPageClientProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddSuccess = () => {
    // The page will be revalidated by the server action
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <HamburgerMenu businessName="Donna Clean" userEmail={userEmail} />
          <h1 className="text-lg font-semibold">Alerts</h1>
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <span className="text-xl">➕</span>
          </button>
        </div>
      </header>

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
