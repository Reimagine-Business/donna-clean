"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { type Entry } from "@/app/daily-entries/actions";
import { createSettlement } from "@/app/settlements/actions";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type CustomerData = {
  id: string;
  name: string;
  itemCount: number;
  totalAmount: number;
  items: Entry[];
};

type CustomerSettlementModalProps = {
  customer: CustomerData | null;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CustomerSettlementModal({
  customer,
  onClose,
  onSuccess,
}: CustomerSettlementModalProps) {
  const router = useRouter();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showItems, setShowItems] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [settlementDate, setSettlementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-select first item if only one item exists
  useEffect(() => {
    if (customer && customer.items.length === 1) {
      setSelectedItemId(customer.items[0].id);
    } else {
      setSelectedItemId(null);
    }
  }, [customer]);

  // Auto-set full amount when item is selected
  useEffect(() => {
    if (selectedItemId && customer) {
      const item = customer.items.find(i => i.id === selectedItemId);
      if (item) {
        const remaining = item.remaining_amount ?? item.amount;
        setAmount(remaining);
      }
    } else {
      setAmount(0);
    }
  }, [selectedItemId, customer]);

  if (!customer) return null;

  const selectedItem = customer.items.find(item => item.id === selectedItemId);
  const selectedAmount = selectedItem ? (selectedItem.remaining_amount ?? selectedItem.amount) : 0;

  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;

  const setHalfAmount = () => {
    if (selectedAmount > 0) {
      const half = Math.round((selectedAmount / 2) * 100) / 100;
      setAmount(half);
    }
  };

  const setFullAmount = () => {
    if (selectedAmount > 0) {
      setAmount(selectedAmount);
    }
  };

  const handleConfirmSettlement = async () => {
    if (!selectedItemId || !selectedItem) {
      showError("Please select an item to settle");
      return;
    }

    if (!amount || amount <= 0) {
      showError("Please enter a valid settlement amount");
      return;
    }

    if (amount > selectedAmount) {
      showError(`Amount cannot exceed ${formatCurrency(selectedAmount)}`);
      return;
    }

    setIsSaving(true);

    try {
      const result = await createSettlement(selectedItemId, amount, settlementDate);

      if (!result.success) {
        showError(result.error || "Failed to settle");
        setIsSaving(false);
        return;
      }

      if (amount < selectedAmount) {
        const remaining = selectedAmount - amount;
        showSuccess(`Partial settlement of ${formatCurrency(amount)} recorded. ${formatCurrency(remaining)} remaining.`);
      } else {
        showSuccess(`Successfully settled ${formatCurrency(amount)}!`);
      }

      onSuccess?.();
      onClose();
      router.refresh();
    } catch (error) {
      console.error("Settlement failed:", error);
      showError("Failed to settle item");
    } finally {
      setIsSaving(false);
    }
  };

  const isPartialSettlement = amount > 0 && amount < customer.totalAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-950 rounded-2xl border border-border shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-6 py-4 border-b border-border bg-slate-950 rounded-t-2xl">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">Settle Credit for {customer.name}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Customer Summary Section */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg text-white">{customer.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {customer.itemCount} pending item{customer.itemCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(customer.totalAmount)}
                </p>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
              </div>
            </div>

            {/* Show Items Expandable Section */}
            <Collapsible open={showItems} onOpenChange={setShowItems}>
              <CollapsibleTrigger className="flex items-center gap-2 mt-4 text-sm text-purple-400 hover:text-purple-300">
                {showItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showItems ? 'Hide Items' : 'Show Items'}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {customer.items.map((item) => {
                  const remaining = item.remaining_amount ?? item.amount;
                  const isSelected = item.id === selectedItemId;

                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-600/30 border-2 border-purple-500'
                          : 'bg-purple-900/20 border-2 border-transparent hover:bg-purple-900/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="settlement-item"
                        checked={isSelected}
                        onChange={() => setSelectedItemId(item.id)}
                        className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <span className="text-sm text-white">
                              {format(new Date(item.entry_date), 'dd MMM yyyy')} • {item.category}
                            </span>
                            {item.remaining_amount !== item.amount && (
                              <p className="text-xs text-purple-400 mt-1">
                                Remaining: {formatCurrency(remaining)} of {formatCurrency(item.amount)}
                              </p>
                            )}
                          </div>
                          <span className="font-medium text-white ml-3">
                            {formatCurrency(remaining)}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Settlement Input Section */}
          <div className="space-y-4">
            {/* Settlement Amount */}
            <div className="space-y-2">
              <Label>Settlement Amount</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    ₹
                  </span>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="pl-8"
                    min="0"
                    max={selectedAmount}
                    step="0.01"
                    disabled={!selectedItemId}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={setHalfAmount}
                  disabled={!selectedItemId}
                >
                  Half
                </Button>
                <Button
                  variant="outline"
                  onClick={setFullAmount}
                  disabled={!selectedItemId}
                >
                  Full
                </Button>
              </div>
              {selectedItemId && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Selected: {formatCurrency(selectedAmount)}</span>
                  {isPartialSettlement && (
                    <span className="text-yellow-400">
                      {formatCurrency(selectedAmount - amount)} will remain
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Settlement Date */}
            <div className="space-y-2">
              <Label>Settlement Date</Label>
              <Input
                type="date"
                value={settlementDate}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setSettlementDate(e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'Cash' | 'Bank')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-slate-950 border-t border-border px-6 py-4 rounded-b-2xl">
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSettlement}
              disabled={!selectedItemId || !amount || amount <= 0 || amount > selectedAmount || isSaving}
            >
              {isSaving
                ? "Processing..."
                : !selectedItemId
                  ? "Select an item"
                  : `Confirm Settlement ${formatCurrency(amount)}`
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
