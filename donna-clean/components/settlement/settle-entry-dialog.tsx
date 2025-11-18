"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { createClient } from "@/lib/supabase/client";
import { Entry } from "@/lib/entries";
import { settleEntry } from "@/lib/settlements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SettleEntryDialogProps = {
  entry: Entry | null;
  onClose: () => void;
};

export function SettleEntryDialog({ entry, onClose }: SettleEntryDialogProps) {
  const supabase = useMemo(() => createClient(), []);
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

  const modalTitle = useMemo(() => {
    if (isCredit && entry.category === "Sales") {
      return "Settle Collection - Cash Inflow";
    }
    if (isCredit) {
      return "Settle Bill - Cash Outflow";
    }
    if (isAdvance) {
      return "Recognise Advance - Accrual Only";
    }
    return "Settle Entry";
  }, [entry.category, isAdvance, isCredit]);

  const handleConfirm = async () => {
    if (!canSettle) {
      setError("Only Credit and Advance entries can be settled");
      return;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (numericAmount > maxAmount) {
      setError("Amount cannot exceed the remaining balance.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await settleEntry({
        supabase,
        entry,
        amount: numericAmount,
        settlementDate,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to settle entry.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Settle Entry</p>
            <h3 className="text-2xl font-semibold text-white">{modalTitle}</h3>
          <p className="text-sm text-slate-400">
            Category: <span className="text-white">{entry.category}</span> · Amount:{" "}
            <span className="text-white">₹{entry.amount.toLocaleString("en-IN")}</span>
          </p>
            {entry.remaining_amount !== undefined && entry.remaining_amount !== entry.amount && (
              <p className="text-xs text-slate-500">
                Remaining: ₹{remainingAmount.toLocaleString("en-IN")}
              </p>
            )}
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-slate-400">Settlement date</Label>
            <Input
              type="date"
              value={settlementDate}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(event) => setSettlementDate(event.target.value)}
              className="border-white/10 bg-slate-900 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-slate-400">Amount</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="border-white/10 bg-slate-900 text-white"
            />
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-300 hover:text-white"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="bg-[#a78bfa] text-white hover:bg-[#9770ff]"
          >
            {isSaving ? "Settling..." : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
