"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { type Entry } from "@/app/entries/actions";
import { createSettlement } from "@/app/settlements/actions";
import { showSuccess, showError } from "@/lib/toast";

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
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
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

  const getTotalSelectedAmount = (): number => {
    return pendingItems
      .filter(item => selectedItemIds.has(item.id))
      .reduce((sum, item) => sum + (item.remaining_amount ?? item.amount), 0);
  };

  // Auto-update settlement amount when selection changes
  useEffect(() => {
    const total = getTotalSelectedAmount();
    setSettlementAmount(total);
  }, [selectedItemIds, pendingItems]);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

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

  const selectAllForParty = (group: PartyGroup) => {
    const allSelected = group.items.every(item => selectedItemIds.has(item.id));

    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        group.items.forEach(item => newSet.delete(item.id));
      } else {
        group.items.forEach(item => newSet.add(item.id));
      }
      return newSet;
    });
  };

  const getSelectedAmountForParty = (partyId: string | null): number => {
    const group = groupedByParty.find(g => g.partyId === partyId);
    if (!group) return 0;

    return group.items
      .filter(item => selectedItemIds.has(item.id))
      .reduce((sum, item) => sum + (item.remaining_amount ?? item.amount), 0);
  };

  const hasSelectedItemsForParty = (partyId: string | null): boolean => {
    const group = groupedByParty.find(g => g.partyId === partyId);
    if (!group) return false;
    return group.items.some(item => selectedItemIds.has(item.id));
  };

  const handleSettle = async () => {
    const selectedTotal = getTotalSelectedAmount();

    // Validation
    if (selectedItemIds.size === 0) {
      showError("Please select at least one item to settle");
      return;
    }

    if (!settlementAmount || settlementAmount <= 0) {
      showError("Please enter a valid settlement amount");
      return;
    }

    if (settlementAmount > selectedTotal) {
      showError(`Amount cannot exceed selected total of ₹${selectedTotal.toLocaleString('en-IN')}`);
      return;
    }

    // For partial settlement, only allow single item
    if (selectedItemIds.size > 1 && settlementAmount < selectedTotal) {
      showError("For partial payment, please select only one item");
      return;
    }

    setIsSaving(true);

    try {
      // Get selected items
      const selectedItems = pendingItems.filter(item => selectedItemIds.has(item.id));

      // If single item with partial amount
      if (selectedItems.length === 1 && settlementAmount < selectedTotal) {
        const item = selectedItems[0];
        const result = await createSettlement(item.id, settlementAmount, settlementDate);

        if (!result.success) {
          showError(`Failed to settle: ${result.error}`);
          setIsSaving(false);
          return;
        }

        const remaining = (item.remaining_amount ?? item.amount) - settlementAmount;
        showSuccess(`Partial settlement of ₹${settlementAmount.toLocaleString('en-IN')} recorded. ₹${remaining.toLocaleString('en-IN')} remaining.`);
      }
      // Full settlement (single or multiple items)
      else {
        for (const item of selectedItems) {
          const amount = item.remaining_amount ?? item.amount;
          const result = await createSettlement(item.id, amount, settlementDate);

          if (!result.success) {
            showError(`Failed to settle item: ${result.error}`);
            setIsSaving(false);
            return;
          }
        }

        showSuccess(`Successfully settled ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}!`);
      }

      // Clear selections
      setSelectedItemIds(new Set());
      setSettlementAmount(0);

      onSuccess?.();
      onClose();
      router.refresh();
    } catch (error) {
      console.error("Settlement failed:", error);
      showError("Failed to settle items");
    } finally {
      setIsSaving(false);
    }
  };

  const isCredit = type === 'credit-sales' || type === 'credit-bills';
  const actionButtonText = type === 'credit-sales' ? 'Collect Payment' : 'Pay Now';
  const selectedTotal = getTotalSelectedAmount();
  const isPartialSettlement = settlementAmount > 0 && settlementAmount < selectedTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-950 rounded-2xl border border-border shadow-2xl">

        {/* Header - Sticky at top - More Compact */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-3 py-2 border-b border-border bg-slate-950 rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white truncate">{getModalTitle()}</h2>
            {selectedItemIds.size > 0 && (
              <p className="text-[10px] sm:text-xs text-purple-400 mt-0.5">
                {selectedItemIds.size} item{selectedItemIds.size > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1 hover:bg-muted/50 rounded-lg transition-colors ml-2 shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body - Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-2 scroll-smooth">
          {pendingItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs sm:text-sm">
              No pending items to settle
            </div>
          ) : (
            groupedByParty.map((group) => {
              const partyKey = group.partyId || 'unknown';
              const isExpanded = expandedParties.has(partyKey);
              const selectedAmount = getSelectedAmountForParty(group.partyId);
              const hasSelected = hasSelectedItemsForParty(group.partyId);
              const allSelected = group.items.every(item => selectedItemIds.has(item.id));

              return (
                <div
                  key={partyKey}
                  className="bg-muted/50 rounded-lg border border-border"
                >
                  {/* Party Header - Ultra Compact */}
                  <div className="p-2.5">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0 mr-2">
                        <h3 className="text-sm sm:text-base font-semibold text-white truncate">{group.partyName}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                          {group.items.length} pending {group.items.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                      <span className="text-base sm:text-lg font-bold text-white whitespace-nowrap ml-2 shrink-0">
                        ₹{group.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Expand/Collapse Button - Ultra Compact */}
                    <button
                      onClick={() => togglePartyExpansion(partyKey)}
                      className="flex items-center gap-1 text-[10px] sm:text-xs text-purple-400 hover:text-purple-300 transition-colors mt-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          Hide
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          Show
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expandable Items List - Ultra Compact */}
                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 space-y-1.5">
                      {/* Select All Button */}
                      <button
                        onClick={() => selectAllForParty(group)}
                        className="text-[10px] sm:text-xs text-purple-400 hover:text-purple-300 underline"
                      >
                        {allSelected ? 'Deselect all' : `Select all ${group.items.length}`}
                      </button>

                      {/* Individual Items - Ultra Compact */}
                      {group.items.map(item => {
                        const remainingAmount = item.remaining_amount ?? item.amount;
                        return (
                          <label
                            key={item.id}
                            className="flex items-start gap-2 p-1.5 bg-purple-900/20 rounded-lg hover:bg-purple-900/30 transition-colors cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedItemIds.has(item.id)}
                              onChange={() => toggleItemSelection(item.id)}
                              className="mt-0.5 w-4 h-4 rounded border-purple-500/50 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] sm:text-xs text-gray-400 block truncate">
                                    {format(new Date(item.entry_date), 'dd MMM yyyy')} • {item.category}
                                  </span>
                                  {item.notes && (
                                    <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 truncate">{item.notes}</p>
                                  )}
                                  {item.remaining_amount !== item.amount && (
                                    <p className="text-[10px] sm:text-xs text-purple-400 mt-0.5">
                                      Remaining: ₹{remainingAmount.toLocaleString('en-IN')} of ₹{item.amount.toLocaleString('en-IN')}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap ml-2 shrink-0">
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

        {/* Footer - Sticky at bottom with mobile clearance */}
        {pendingItems.length > 0 && (
          <div className="sticky bottom-0 z-10 bg-slate-950 border-t border-border px-3 py-2 pb-20 sm:pb-3 rounded-b-2xl space-y-2">

            {/* Settlement Amount Input */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300">
                Settlement Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  ₹
                </span>
                <input
                  type="number"
                  value={settlementAmount || ''}
                  onChange={(e) => setSettlementAmount(Number(e.target.value))}
                  placeholder="Enter amount"
                  className="w-full pl-8 pr-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  min="0"
                  max={selectedTotal}
                  step="0.01"
                  disabled={selectedItemIds.size === 0}
                />
              </div>
              <div className="flex justify-between text-[10px] sm:text-xs text-gray-400">
                <span>Selected total: ₹{selectedTotal.toLocaleString('en-IN')}</span>
                {selectedItemIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSettlementAmount(selectedTotal)}
                    className="text-purple-400 underline hover:text-purple-300"
                  >
                    Use full amount
                  </button>
                )}
              </div>
            </div>

            {/* Partial Settlement Warning */}
            {isPartialSettlement && selectedItemIds.size === 1 && (
              <div className="flex items-start gap-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-[10px] sm:text-xs text-yellow-400">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>
                  Partial payment: ₹{(selectedTotal - settlementAmount).toLocaleString('en-IN')} will remain pending
                </span>
              </div>
            )}

            {/* Date and Payment Method */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-300">
                  Settlement Date
                </label>
                <input
                  type="date"
                  value={settlementDate}
                  max={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 h-9"
                />
              </div>

              {isCredit && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-300">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Bank')}
                    className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 h-9"
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
              disabled={selectedItemIds.size === 0 || !settlementAmount || settlementAmount <= 0 || isSaving}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors text-sm disabled:cursor-not-allowed"
            >
              {isSaving
                ? "Settling..."
                : selectedItemIds.size === 0
                  ? "Select items to settle"
                  : !settlementAmount || settlementAmount <= 0
                    ? "Enter amount to settle"
                    : `${actionButtonText} ₹${settlementAmount.toLocaleString('en-IN')} →`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
