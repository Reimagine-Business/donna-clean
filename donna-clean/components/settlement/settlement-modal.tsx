"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { X, ArrowLeft } from "lucide-react";
import { type Entry } from "@/app/entries/actions";
import { createSettlement } from "@/app/settlements/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/lib/toast";

type SettlementType = 'credit-sales' | 'credit-bills' | 'advance-sales' | 'advance-expenses';

type SettlementModalProps = {
  type: SettlementType;
  pendingItems: Entry[];
  onClose: () => void;
  onSuccess?: () => void;
};

export function SettlementModal({ type, pendingItems, onClose, onSuccess }: SettlementModalProps) {
  const router = useRouter();
  const [view, setView] = useState<'list' | 'details'>('list');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementDate, setSettlementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const getModalTitle = () => {
    switch (type) {
      case 'credit-sales':
        return 'Settle Credit Sales';
      case 'credit-bills':
        return 'Settle Credit Bills';
      case 'advance-sales':
        return 'Settle Advance Sales';
      case 'advance-expenses':
        return 'Settle Advance Expenses';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'credit-sales':
        return 'Select Credit Sales to collect. This will create Cash IN entries and mark items as settled.';
      case 'credit-bills':
        return 'Select Credit Bills to pay. This will create Cash OUT entries and mark items as settled.';
      case 'advance-sales':
        return 'Select Advance Sales to recognize as revenue. This will NOT create new cash entries (already counted).';
      case 'advance-expenses':
        return 'Select Advance Expenses to recognize. This will NOT create new cash entries (already counted).';
    }
  };

  const handleSelectItem = (entry: Entry) => {
    setSelectedEntry(entry);
    const remainingAmount = entry.remaining_amount ?? entry.amount;
    setSettlementAmount(remainingAmount.toString());
    setView('details');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedEntry(null);
    setSettlementAmount("");
    setNotes("");
  };

  const handleSettle = async () => {
    if (!selectedEntry) return;

    const amount = parseFloat(settlementAmount) || 0;
    if (amount <= 0) {
      showError("Please enter a valid settlement amount");
      return;
    }

    const remainingAmount = selectedEntry.remaining_amount ?? selectedEntry.amount;
    if (amount > remainingAmount) {
      showError("Settlement amount cannot exceed remaining amount");
      return;
    }

    setIsSaving(true);

    try {
      const result = await createSettlement(selectedEntry.id, amount, settlementDate);

      if (!result.success) {
        showError(result.error || "Failed to settle item");
      } else {
        showSuccess("Item settled successfully!");
        handleBackToList();
        onSuccess?.();
        onClose();
        router.refresh();
      }
    } catch (error) {
      console.error("Settlement failed:", error);
      showError("Failed to settle item");
    } finally {
      setIsSaving(false);
    }
  };

  const isCredit = type === 'credit-sales' || type === 'credit-bills';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 overflow-y-auto py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-white">{getModalTitle()}</h2>
            <p className="text-sm text-muted-foreground mt-1">{getDescription()}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {view === 'list' ? (
            // LIST VIEW
            pendingItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending items to settle
              </div>
            ) : (
              <div className="space-y-2">
                {pendingItems.map((entry) => {
                  const remainingAmount = entry.remaining_amount ?? entry.amount;

                  return (
                    <div
                      key={entry.id}
                      className="bg-muted/50 rounded-lg p-3 border border-border hover:border-purple-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {entry.category}
                          </span>
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                            {entry.entry_type}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-white">
                          ₹{remainingAmount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground mb-3">
                        <div>Entry Date: {format(new Date(entry.entry_date), 'dd MMM yyyy')}</div>
                        {entry.notes && <div className="mt-1">Note: {entry.notes}</div>}
                        {entry.remaining_amount !== entry.amount && (
                          <div className="mt-1 text-purple-400">
                            Remaining: ₹{remainingAmount.toLocaleString('en-IN')} of ₹{entry.amount.toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleSelectItem(entry)}
                        className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        Settle This Item
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // DETAILS VIEW
            selectedEntry && (
              <div className="space-y-3">
                {/* Back Button */}
                <button
                  onClick={handleBackToList}
                  disabled={isSaving}
                  className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors mb-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to List
                </button>

                {/* Selected Item Summary */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {selectedEntry.category}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                        {selectedEntry.entry_type}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-white">
                      ₹{(selectedEntry.remaining_amount ?? selectedEntry.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Entry Date: {format(new Date(selectedEntry.entry_date), 'dd MMM yyyy')}
                  </div>
                </div>

                {/* Settlement Form */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Settlement Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    max={selectedEntry.remaining_amount ?? selectedEntry.amount}
                    step="0.01"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    className="bg-card border-border text-white"
                  />
                </div>

                {/* Date and Payment Method */}
                {isCredit ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">Settlement Date</Label>
                      <Input
                        type="date"
                        value={settlementDate}
                        max={format(new Date(), "yyyy-MM-dd")}
                        onChange={(e) => setSettlementDate(e.target.value)}
                        className="bg-card border-border text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">Payment Method</Label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Bank')}
                        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Settlement Date</Label>
                    <Input
                      type="date"
                      value={settlementDate}
                      max={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => setSettlementDate(e.target.value)}
                      className="bg-card border-border text-white"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Notes (Optional)</Label>
                  <Input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes..."
                    className="bg-card border-border text-white"
                  />
                </div>

                {/* Summary */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Amount to Settle:</span>
                    <span className="text-lg font-bold text-purple-400">
                      ₹{parseFloat(settlementAmount || "0").toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Settle Button */}
                <Button
                  onClick={handleSettle}
                  disabled={isSaving || !settlementAmount || parseFloat(settlementAmount) <= 0}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSaving ? "Settling..." : "Settle Now"}
                </Button>
              </div>
            )
          )}
        </div>

        {/* Footer - Only show in list view */}
        {view === 'list' && pendingItems.length > 0 && (
          <div className="p-4 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              Select an item above to settle it
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
