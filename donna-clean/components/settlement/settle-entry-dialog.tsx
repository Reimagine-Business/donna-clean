"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Entry } from "@/lib/entries";
import { createSettlement } from "@/app/settlements/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/lib/toast";

type SettleEntryDialogProps = {
  entry: Entry | null;
  onClose: () => void;
};

export function SettleEntryDialog({ entry, onClose }: SettleEntryDialogProps) {
  const router = useRouter();
  const [settlementDate, setSettlementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      setSettlementDate(format(new Date(), "yyyy-MM-dd"));
      const remaining = entry.remaining_amount ?? entry.amount;
      setAmount(remaining.toString());
      setError(null);
    }
  }, [entry]);

  if (!entry) return null;

  const remainingAmount = entry.remaining_amount ?? entry.amount;
  const maxAmount = remainingAmount;
  const isCredit = entry.entry_type === "Credit";
  const isAdvance = entry.entry_type === "Advance";
  const canSettle = isCredit || isAdvance;

  const modalTitle = isCredit && entry.category === "Sales"
    ? "Settle Collection - Cash Inflow"
    : isCredit
      ? "Settle Bill - Cash Outflow"
      : "Recognise Advance - Accrual Only";

  const handleConfirm = async () => {
    if (!canSettle) {
      setError("Only Credit and Advance entries can be settled");
      return;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0 || numericAmount > maxAmount) {
      setError("Enter a valid amount that does not exceed the remaining balance.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Use Server Action for settlement (no client-side Supabase!)
      const result = await createSettlement(entry.id, numericAmount, settlementDate);

      if (!result.success) {
        showError(result.error || "Failed to settle entry");
        setError(result.error);
        return;
      }

      // Show success message
      showSuccess("Settlement created successfully!");

      // Close dialog first
      onClose();

      // Refresh the current page data without full reload
      router.refresh();
    } catch (err) {
      console.error("Settlement failed", err);
      const errorMessage = err instanceof Error ? err.message : "Unable to settle entry.";
      showError(errorMessage);
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-slate-950 p-6 shadow-2xl">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Settle Entry</p>
          <h3 className="text-2xl font-semibold text-white">{modalTitle}</h3>
          <p className="text-sm text-muted-foreground">
            Category: <span className="text-white">{entry.category}</span> · Amount:{" "}
            <span className="text-white">₹{entry.amount.toLocaleString("en-IN")}</span>
          </p>
          {entry.remaining_amount !== undefined && entry.remaining_amount !== entry.amount && (
            <p className="text-xs text-muted-foreground">
              Remaining: ₹{remainingAmount.toLocaleString("en-IN")}
            </p>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Settlement date</Label>
            <Input
              type="date"
              value={settlementDate}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setSettlementDate(e.target.value)}
              className="border-border bg-card text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Amount</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-border bg-card text-white"
            />
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="text-foreground/70 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {isSaving ? "Settling..." : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
