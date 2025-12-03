"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { X, ChevronDown, ChevronUp } from "lucide-react";
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
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      group.items.forEach(item => newSet.add(item.id));
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

  const handleSettleParty = async (group: PartyGroup) => {
    const selectedItems = group.items.filter(item => selectedItemIds.has(item.id));

    if (selectedItems.length === 0) {
      showError("Please select at least one item to settle");
      return;
    }

    setIsSaving(true);

    try {
      // Settle each selected item
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

      // Clear selections for settled items
      setSelectedItemIds(prev => {
        const newSet = new Set(prev);
        selectedItems.forEach(item => newSet.delete(item.id));
        return newSet;
      });

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 overflow-y-auto py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-white">{getModalTitle()}</h2>
            {selectedItemIds.size > 0 && (
              <p className="text-sm text-purple-400 mt-1">
                {selectedItemIds.size} item{selectedItemIds.size > 1 ? 's' : ''} selected
              </p>
            )}
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
          {pendingItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending items to settle
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByParty.map((group) => {
                const partyKey = group.partyId || 'unknown';
                const isExpanded = expandedParties.has(partyKey);
                const selectedAmount = getSelectedAmountForParty(group.partyId);
                const hasSelected = hasSelectedItemsForParty(group.partyId);

                return (
                  <div
                    key={partyKey}
                    className="bg-muted/50 rounded-lg border border-border"
                  >
                    {/* Party Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white">{group.partyName}</h3>
                          <p className="text-sm text-gray-400 mt-1">
                            {group.items.length} pending {group.items.length === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                        <span className="text-2xl font-bold text-white">
                          ₹{group.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => togglePartyExpansion(partyKey)}
                        className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors mt-2"
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

                    {/* Expandable Items List */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2">
                        {/* Select All Button */}
                        <button
                          onClick={() => selectAllForParty(group)}
                          className="text-xs text-purple-400 hover:text-purple-300 underline"
                        >
                          Select all {group.items.length} items
                        </button>

                        {/* Individual Items */}
                        {group.items.map(item => {
                          const remainingAmount = item.remaining_amount ?? item.amount;
                          return (
                            <label
                              key={item.id}
                              className="flex items-start gap-3 p-3 bg-purple-900/20 rounded-lg hover:bg-purple-900/30 transition-colors cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedItemIds.has(item.id)}
                                onChange={() => toggleItemSelection(item.id)}
                                className="mt-1 w-4 h-4 rounded border-purple-500/50 text-purple-600 focus:ring-purple-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <span className="text-sm text-white">
                                      {format(new Date(item.entry_date), 'dd MMM yyyy')} • {item.entry_type} {item.category}
                                    </span>
                                    {item.notes && (
                                      <p className="text-xs text-gray-500 mt-1 truncate">{item.notes}</p>
                                    )}
                                    {item.remaining_amount !== item.amount && (
                                      <p className="text-xs text-purple-400 mt-1">
                                        Remaining: ₹{remainingAmount.toLocaleString('en-IN')} of ₹{item.amount.toLocaleString('en-IN')}
                                      </p>
                                    )}
                                  </div>
                                  <span className="font-semibold text-white whitespace-nowrap">
                                    ₹{remainingAmount.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Settle Button */}
                    {hasSelected && (
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => handleSettleParty(group)}
                          disabled={isSaving}
                          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? "Settling..." : `${actionButtonText} ₹${selectedAmount.toLocaleString('en-IN')} →`}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {pendingItems.length > 0 && (
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1">Settlement Date</Label>
                <Input
                  type="date"
                  value={settlementDate}
                  max={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="bg-card border-border text-white text-sm"
                />
              </div>
              {isCredit && (
                <div className="flex-1">
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
