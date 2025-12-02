"use client";

import { useState, useEffect } from "react";
import { Plus, X, Check } from "lucide-react";
import { getParties, createParty } from "@/app/parties/actions";
import type { Party, PartyType } from "@/lib/parties";
import { filterPartiesByType, getRequiredPartyType } from "@/lib/parties";
import { showSuccess, showError } from "@/lib/toast";

interface PartySelectorProps {
  entryType: string;
  category: string;
  value?: string;
  onChange: (partyId: string | undefined) => void;
}

/**
 * PartySelector - Smart party (customer/vendor) selection component
 *
 * Shows party selection field for Credit and Advance entries.
 * Automatically filters parties based on entry type:
 * - Credit Sales / Advance Received → Shows Customers
 * - Credit Purchases / Advance Paid → Shows Vendors
 *
 * Allows inline creation of new parties without leaving the form.
 */
export function PartySelector({ entryType, category, value, onChange }: PartySelectorProps) {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPartyInput, setShowNewPartyInput] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyMobile, setNewPartyMobile] = useState("");
  const [creating, setCreating] = useState(false);

  // Determine if party field should be shown and what type
  const requiredPartyType = getRequiredPartyType(entryType, category);
  const shouldShow = requiredPartyType !== null;

  useEffect(() => {
    loadParties();
  }, []);

  async function loadParties() {
    setLoading(true);
    const result = await getParties();
    if (result.success && result.parties) {
      setParties(result.parties);
    }
    setLoading(false);
  }

  async function handleCreateParty() {
    if (!newPartyName.trim()) {
      showError("Please enter a party name");
      return;
    }

    if (!requiredPartyType) return;

    setCreating(true);

    const result = await createParty({
      name: newPartyName.trim(),
      mobile: newPartyMobile.trim() || undefined,
      party_type: requiredPartyType,
    });

    setCreating(false);

    if (result.success && result.party) {
      // Add new party to the list
      setParties([...parties, result.party]);

      // Select the newly created party
      onChange(result.party.id);

      // Reset form
      setShowNewPartyInput(false);
      setNewPartyName("");
      setNewPartyMobile("");

      showSuccess(`${requiredPartyType} "${result.party.name}" created successfully`);
    } else {
      showError(result.error || "Failed to create party");
    }
  }

  function handleCancel() {
    setShowNewPartyInput(false);
    setNewPartyName("");
    setNewPartyMobile("");
  }

  // Don't show for Cash IN/OUT or other non-party entries
  if (!shouldShow || !requiredPartyType) {
    return null;
  }

  // Filter parties based on required type
  const filteredParties = filterPartiesByType(parties, requiredPartyType);

  const partyLabel = requiredPartyType === 'Customer' ? 'CUSTOMER' : 'VENDOR';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-purple-200">
        {partyLabel} <span className="text-red-400">*</span>
      </label>

      {!showNewPartyInput ? (
        /* ========== PARTY SELECTION DROPDOWN ========== */
        <div className="relative">
          <select
            value={value || ""}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setShowNewPartyInput(true);
              } else {
                onChange(e.target.value || undefined);
              }
            }}
            className="w-full px-4 py-2.5 rounded-lg bg-purple-900/20 border border-purple-500/30 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
            required
            disabled={loading}
          >
            <option value="">
              {loading ? "Loading parties..." : `Select ${partyLabel.toLowerCase()}...`}
            </option>

            {filteredParties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
                {party.mobile ? ` (${party.mobile})` : ""}
              </option>
            ))}

            <option value="__new__" className="font-semibold text-purple-300">
              + Add new {partyLabel.toLowerCase()}...
            </option>
          </select>
        </div>
      ) : (
        /* ========== NEW PARTY CREATION FORM ========== */
        <div className="space-y-3 p-4 bg-purple-900/10 border border-purple-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-purple-200">
              Create New {partyLabel}
            </h4>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 text-purple-300 hover:text-white transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Party Name Input */}
          <div>
            <label className="block text-xs font-medium text-purple-300 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newPartyName}
              onChange={(e) => setNewPartyName(e.target.value)}
              placeholder={`Enter ${partyLabel.toLowerCase()} name...`}
              className="w-full px-3 py-2 rounded-lg bg-purple-900/20 border border-purple-500/30 text-white placeholder:text-purple-400/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              autoFocus
              disabled={creating}
            />
          </div>

          {/* Party Mobile Input (Optional) */}
          <div>
            <label className="block text-xs font-medium text-purple-300 mb-1">
              Mobile (optional)
            </label>
            <input
              type="tel"
              value={newPartyMobile}
              onChange={(e) => setNewPartyMobile(e.target.value)}
              placeholder="Enter mobile number..."
              className="w-full px-3 py-2 rounded-lg bg-purple-900/20 border border-purple-500/30 text-white placeholder:text-purple-400/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              disabled={creating}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleCreateParty}
              disabled={creating || !newPartyName.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={creating}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600/50 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-purple-400/70">
        {requiredPartyType === 'Customer'
          ? "Select or create a customer for this sale/collection"
          : "Select or create a vendor for this purchase/payment"}
      </p>
    </div>
  );
}
