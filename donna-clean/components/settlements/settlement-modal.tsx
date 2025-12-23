"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { type Entry } from "@/lib/entries";
import { createSettlement } from "@/app/settlements/actions";
import { showSuccess, showError } from "@/lib/toast";
import { analytics } from "@/lib/event-tracking";

type SettlementType = 'credit-sales' | 'credit-bills' | 'advance-sales' | 'advance-expenses';

type SettlementModalProps = {
  type: SettlementType;
  pendingItems: Entry[];
  onClose: () => void;
  onSuccess?: () => void;
};

type PartyGroup = {
  partyId: string | null;
  partyName: string;
  totalAmount: number;
  items: Entry[];
};

export function SettlementModal({ type, pendingItems, onClose, onSuccess }: SettlementModalProps) {
  const router = useRouter();

  // Changed from Set<string> to string | null for single selection
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedParties, setExpandedParties] = useState<Set<string>>(new Set());
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [settlementDate, setSettlementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Cash');
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

  // Group entries by party
  const groupedByParty = useMemo<PartyGroup[]>(() => {
    const groups = new Map<string, PartyGroup>();

    pendingItems.forEach(entry => {
      const partyKey = entry.party_id || 'unknown';
      const partyName = entry.party?.name ||
        (entry.category === 'Sales' ? 'Unknown Customer' : 'Unknown Vendor');

      if (!groups.has(partyKey)) {
        groups.set(partyKey, {
          partyId: entry.party_id ?? null,
          partyName,
          totalAmount: 0,
          items: []
        });
      }

      const group = groups.get(partyKey)!;
      group.totalAmount += (entry.remaining_amount ?? entry.amount);
      group.items.push(entry);
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.partyName.localeCompare(b.partyName)
    );
  }, [pendingItems]);

  // Get selected item details
  const selectedItem = selectedItemId
    ? pendingItems.find(item => item.id === selectedItemId)
    : null;

  const selectedAmount = selectedItem
    ? (selectedItem.remaining_amount ?? selectedItem.amount)
    : 0;

  // Auto-set full amount when item is selected
  useEffect(() => {
    if (selectedItem) {
      const amount = selectedItem.remaining_amount ?? selectedItem.amount;
      setSettlementAmount(amount);

      // Auto-expand the party group containing this item
      const partyKey = selectedItem.party_id || 'unknown';
      setExpandedParties(prev => new Set(prev).add(partyKey));
    } else {
      setSettlementAmount(0);
    }
  }, [selectedItem]);

  const togglePartyExpansion = (partyKey: string) => {
    setExpandedParties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partyKey)) {
        newSet.delete(partyKey);
      } else {
        newSet.add(partyKey);
      }
      return newSet;
    });
  };

  // Handle radio button selection
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  // Quick amount buttons
  const setHalfAmount = () => {
    if (selectedAmount > 0) {
      const half = Math.round((selectedAmount / 2) * 100) / 100; // Round to 2 decimals
      setSettlementAmount(half);
    }
  };

  const setFullAmount = () => {
    if (selectedAmount > 0) {
      setSettlementAmount(selectedAmount);
    }
  };

  const handleSettle = async () => {
    // Validation
    if (!selectedItemId || !selectedItem) {
      showError("Please select an item to settle");
      return;
    }

    if (!settlementAmount || settlementAmount <= 0) {
      showError("Please enter a valid settlement amount");
      return;
    }

    if (settlementAmount > selectedAmount) {
      showError(`Amount cannot exceed ₹${selectedAmount.toLocaleString('en-IN')}`);
      return;
    }

    setIsSaving(true);

    try {
      const result = await createSettlement(selectedItemId, settlementAmount, settlementDate);

      if (!result.success) {
        showError(`Failed to settle: ${result.error}`);
        setIsSaving(false);
        return;
      }

      // Success message
      if (settlementAmount < selectedAmount) {
        const remaining = selectedAmount - settlementAmount;
        showSuccess(`Partial settlement of ₹${settlementAmount.toLocaleString('en-IN')} recorded. ₹${remaining.toLocaleString('en-IN')} remaining.`);
      } else {
        showSuccess(`Successfully settled ₹${settlementAmount.toLocaleString('en-IN')}!`);
      }

      // Track analytics event
      analytics.settlementCompleted(type, settlementAmount);

      // Clear selection
      setSelectedItemId(null);
      setSettlementAmount(0);

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

  const isCredit = type === 'credit-sales' || type === 'credit-bills';
  const actionButtonText = type === 'credit-sales' ? 'Collect Payment' : 'Pay Now';
  const isPartialSettlement = settlementAmount > 0 && settlementAmount < selectedAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-950 rounded-2xl border border-border shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-4 py-3 border-b border-border bg-slate-950 rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">{getModalTitle()}</h2>
            {selectedItem && (
              <p className="text-xs sm:text-sm text-purple-400 mt-1">
                Selected: {selectedItem.party?.name || 'Unknown'} • ₹{selectedAmount.toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors ml-2 shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body - Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
          {pendingItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No pending items to settle
            </div>
          ) : (
            groupedByParty.map((group) => {
              const partyKey = group.partyId || 'unknown';
              const isExpanded = expandedParties.has(partyKey);
              const hasSelectedItem = group.items.some(item => item.id === selectedItemId);

              return (
                <div
                  key={partyKey}
                  className={`rounded-lg border transition-all ${
                    hasSelectedItem
                      ? 'bg-purple-900/20 border-purple-500/50'
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  {/* Party Header */}
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <h3 className="text-base sm:text-lg font-semibold text-white truncate">
                          {group.partyName}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">
                          {group.items.length} pending {group.items.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                      <span className="text-lg sm:text-xl font-bold text-white whitespace-nowrap ml-2 shrink-0">
                        ₹{group.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => togglePartyExpansion(partyKey)}
                      className="flex items-center gap-1.5 text-xs sm:text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide items
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show items
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expandable Items List with Radio Buttons */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      {group.items.map(item => {
                        const remainingAmount = item.remaining_amount ?? item.amount;
                        const isSelected = item.id === selectedItemId;

                        return (
                          <label
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600/30 border-2 border-purple-500'
                                : 'bg-purple-900/20 border-2 border-transparent hover:bg-purple-900/30'
                            }`}
                          >
                            <input
                              type="radio"
                              name="settlement-item"
                              checked={isSelected}
                              onChange={() => handleItemSelect(item.id)}
                              className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500 focus:ring-2 cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs sm:text-sm text-gray-300 block">
                                    {format(new Date(item.entry_date), 'dd MMM yyyy')} • {item.category}
                                  </span>
                                  {item.notes && (
                                    <p className="text-xs text-gray-500 mt-1 truncate">{item.notes}</p>
                                  )}
                                  {item.remaining_amount !== item.amount && (
                                    <p className="text-xs sm:text-sm text-purple-400 mt-1.5">
                                      Remaining: ₹{remainingAmount.toLocaleString('en-IN')} of ₹{item.amount.toLocaleString('en-IN')}
                                    </p>
                                  )}
                                </div>
                                <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap ml-3 shrink-0">
                                  ₹{remainingAmount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer - Settlement Details (All in one) */}
        {pendingItems.length > 0 && (
          <div className="sticky bottom-0 z-10 bg-slate-950 border-t border-border px-4 py-3 pb-20 sm:pb-4 rounded-b-2xl space-y-3">

            {/* Settlement Amount Input with Quick Buttons */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Settlement Amount
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={settlementAmount || ''}
                    onChange={(e) => setSettlementAmount(Number(e.target.value))}
                    placeholder="Enter amount"
                    className="w-full pl-8 pr-3 py-2.5 bg-purple-900/20 border border-purple-500/30 rounded-lg text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    min="0"
                    max={selectedAmount}
                    step="0.01"
                    disabled={!selectedItemId}
                  />
                </div>
                {/* Quick Amount Buttons */}
                <button
                  type="button"
                  onClick={setHalfAmount}
                  disabled={!selectedItemId}
                  className="px-4 py-2.5 bg-purple-700/40 hover:bg-purple-700/60 disabled:bg-gray-700/40 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors text-sm disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Half
                </button>
                <button
                  type="button"
                  onClick={setFullAmount}
                  disabled={!selectedItemId}
                  className="px-4 py-2.5 bg-purple-700/40 hover:bg-purple-700/60 disabled:bg-gray-700/40 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors text-sm disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Full
                </button>
              </div>
              {selectedItemId && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Selected: ₹{selectedAmount.toLocaleString('en-IN')}</span>
                  {isPartialSettlement && (
                    <span className="text-yellow-400">
                      ₹{(selectedAmount - settlementAmount).toLocaleString('en-IN')} will remain
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Date and Payment Method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">
                  Settlement Date
                </label>
                <input
                  type="date"
                  value={settlementDate}
                  max={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-purple-900/20 border border-purple-500/30 rounded-lg text-sm text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {isCredit && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Bank')}
                    className="w-full px-3 py-2.5 bg-purple-900/20 border border-purple-500/30 rounded-lg text-sm text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>
              )}
            </div>

            {/* Settlement Button */}
            <button
              onClick={handleSettle}
              disabled={!selectedItemId || !settlementAmount || settlementAmount <= 0 || isSaving}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-semibold transition-colors text-sm disabled:cursor-not-allowed"
            >
              {isSaving
                ? "Processing..."
                : !selectedItemId
                  ? "Select an item to settle"
                  : !settlementAmount || settlementAmount <= 0
                    ? "Enter settlement amount"
                    : `${actionButtonText} ₹${settlementAmount.toLocaleString('en-IN')} →`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
