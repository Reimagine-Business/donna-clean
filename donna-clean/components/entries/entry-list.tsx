"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { MoreVertical, Edit2, Trash2, Eye } from "lucide-react";
import { type Entry, type Category } from "@/app/entries/actions";
import { EditEntryModal } from "./edit-entry-modal";
import { DeleteEntryDialog } from "./delete-entry-dialog";
import { EntryDetailsModal } from "./entry-details-modal";

interface EntryListProps {
  entries: Entry[];
  categories: Category[];
  onRefresh: () => void;
}

interface MenuPosition {
  top: number;
  left: number;
}

export function EntryList({ entries, categories, onRefresh }: EntryListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const handleCloseMenu = () => setOpenMenuId(null);

  const handleOpenMenu = (entryId: string) => {
    const button = buttonRefs.current[entryId];
    if (button) {
      const rect = button.getBoundingClientRect();
      const menuWidth = 192; // w-48 = 12rem = 192px
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate vertical position
      let top = rect.bottom + 4; // 4px gap below button
      const menuHeight = 150; // Approximate height

      // If menu would go off bottom of screen, show it above the button
      if (top + menuHeight > viewportHeight) {
        top = rect.top - menuHeight - 4;
      }

      // Calculate horizontal position - align to right edge of button
      let left = rect.right - menuWidth;

      // Ensure menu doesn't go off screen on the left
      if (left < 8) {
        left = 8; // 8px from left edge
      }

      // Ensure menu doesn't go off screen on the right
      if (left + menuWidth > viewportWidth - 8) {
        left = viewportWidth - menuWidth - 8; // 8px from right edge
      }

      setMenuPosition({ top, left });
      setOpenMenuId(entryId);
    }
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    handleCloseMenu();
  };

  const handleDelete = (entry: Entry) => {
    setDeletingEntry(entry);
    handleCloseMenu();
  };

  const handleView = (entry: Entry) => {
    setViewingEntry(entry);
    handleCloseMenu();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case "Cash IN":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Cash OUT":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Credit":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Advance":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "Credit Settlement (Collections)":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Credit Settlement (Bills)":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "Advance Settlement (Received)":
        return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "Advance Settlement (Paid)":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-purple-500/30 bg-purple-900/5 p-8">
        <div className="text-center py-8">
          <p className="text-purple-300">No entries found for selected period</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Compact Table Layout - Mobile Only with Horizontal Scroll */}
      <div className="md:hidden bg-purple-900/10 border border-purple-500/30 rounded-lg overflow-hidden">
        <div className="overflow-x-auto -mx-0">
          <div className="min-w-[700px]">
            {/* Table Header */}
            <div className="bg-purple-900/20 px-1.5 py-1.5 grid grid-cols-[45px_115px_75px_80px_75px_50px_35px] gap-1 text-[10px] font-semibold text-purple-300 border-b border-purple-500/30">
              <div className="whitespace-nowrap">DATE</div>
              <div className="whitespace-nowrap">TYPE</div>
              <div className="text-left whitespace-nowrap">PARTY</div>
              <div className="text-left whitespace-nowrap">CATEGORY</div>
              <div className="text-right whitespace-nowrap">AMOUNT</div>
              <div className="text-center whitespace-nowrap">PAYMENT</div>
              <div></div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-purple-500/20">
              {entries.map((entry) => {
                const isIncome =
                  entry.entry_type === "Cash IN" ||
                  (entry.entry_type === "Credit" && entry.category === "Sales") ||
                  (entry.entry_type === "Advance" && entry.category === "Sales");
                const isMenuOpen = openMenuId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className="px-1.5 py-1.5 grid grid-cols-[45px_115px_75px_80px_75px_50px_35px] gap-1 items-center hover:bg-purple-900/20 transition-colors"
                  >
                {/* Date */}
                <div className="text-[10px] text-purple-300 whitespace-nowrap">
                  <div className="font-semibold text-white text-xs">
                    {format(new Date(entry.entry_date), "dd")}
                  </div>
                  <div className="text-[9px]">
                    {format(new Date(entry.entry_date), "MMM")}
                  </div>
                </div>

                {/* Entry Type */}
                <div className="overflow-hidden flex items-center gap-1">
                  <span
                    className={`inline-block px-1 py-0.5 rounded text-[9px] font-medium border truncate max-w-full ${getEntryTypeColor(
                      entry.entry_type
                    )}`}
                    title={entry.entry_type}
                  >
                    {entry.entry_type}
                  </span>
                  {entry.is_settlement && (
                    <span className="text-[8px] text-purple-400" title="Settlement Entry">
                      ⚡
                    </span>
                  )}
                </div>

                {/* Party */}
                <div className="text-[9px] text-purple-300 text-left truncate">
                  {entry.party?.name || "-"}
                </div>

                {/* Category */}
                <div className="text-[10px] text-purple-200 text-left truncate">
                  {entry.category}
                </div>

                {/* Amount */}
                <div
                  className={`text-right text-[10px] font-semibold whitespace-nowrap ${
                    isIncome ? "text-green-400" : "text-red-400"
                  }`}
                >
                  ₹{entry.amount.toLocaleString("en-IN")}
                </div>

                {/* Payment Method */}
                <div className="text-[9px] text-purple-300 text-center whitespace-nowrap">
                  {entry.payment_method || "None"}
                </div>

                {/* Actions */}
                <div className="flex justify-center items-center">
                  <button
                    ref={(el) => { buttonRefs.current[entry.id] = el; }}
                    onClick={() =>
                      isMenuOpen ? handleCloseMenu() : handleOpenMenu(entry.id)
                    }
                    className="p-1 hover:bg-purple-600/30 text-purple-300 rounded transition-colors"
                    title="Actions"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
          </div>
        </div>
      </div>

      {/* Desktop Table Layout - Hidden on Mobile */}
      <div className="hidden md:block rounded-lg border border-purple-500/30 bg-purple-900/5 overflow-hidden">
        {/* Table Header - Fixed Width Columns */}
        <div className="grid grid-cols-[80px_120px_140px_110px_1fr_100px_50px] gap-4 px-4 py-3 bg-purple-900/20 border-b border-purple-500/30 font-medium text-sm uppercase tracking-wide text-purple-200">
          <div className="text-left">DATE</div>
          <div className="text-left">ENTRY TYPE</div>
          <div className="text-left">PARTY</div>
          <div className="text-left">CATEGORY</div>
          <div className="text-right">AMOUNT</div>
          <div className="text-left">PAYMENT</div>
          <div></div>
        </div>

        {/* Table Body - Matching Column Widths */}
        <div className="divide-y divide-purple-500/20">
          {entries.map((entry) => {
            const isIncome =
              entry.entry_type === "Cash IN" ||
              (entry.entry_type === "Credit" && entry.category === "Sales") ||
              (entry.entry_type === "Advance" && entry.category === "Sales");
            const isMenuOpen = openMenuId === entry.id;

            return (
              <div
                key={entry.id}
                className="grid grid-cols-[80px_120px_140px_110px_1fr_100px_50px] gap-4 px-4 py-4 hover:bg-purple-900/20 transition-colors items-center"
              >
                {/* Date - Fixed 80px */}
                <div className="flex flex-col text-sm">
                  <span className="font-medium text-white text-base">
                    {format(new Date(entry.entry_date), "dd")}
                  </span>
                  <span className="text-purple-400 text-xs">
                    {format(new Date(entry.entry_date), "MMM")}
                  </span>
                </div>

                {/* Entry Type - Fixed 120px */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium border whitespace-nowrap ${getEntryTypeColor(
                      entry.entry_type
                    )}`}
                  >
                    {entry.entry_type}
                  </span>
                  {entry.is_settlement && (
                    <span className="text-xs text-purple-400" title="Settlement Entry">
                      ⚡
                    </span>
                  )}
                </div>

                {/* Party - Fixed 140px */}
                <div className="text-sm text-purple-300 truncate">
                  {entry.party?.name || "-"}
                </div>

                {/* Category - Fixed 110px */}
                <div className="text-sm text-white">{entry.category}</div>

                {/* Amount - Flex (takes remaining space, right-aligned) */}
                <div
                  className={`text-right font-medium text-base ${
                    isIncome ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isIncome ? "+ " : "- "}
                  {formatCurrency(entry.amount)}
                </div>

                {/* Payment Method - Fixed 110px */}
                <div className="text-sm">
                  {entry.payment_method && (
                    <span className="inline-flex items-center px-3 py-1 rounded bg-purple-900/30 text-purple-300 text-xs border border-purple-500/30 whitespace-nowrap">
                      {entry.payment_method}
                    </span>
                  )}
                </div>

                {/* Actions Menu - Fixed 50px */}
                <div className="flex items-center justify-end">
                  <button
                    ref={(el) => { buttonRefs.current[entry.id] = el; }}
                    onClick={() =>
                      isMenuOpen ? handleCloseMenu() : handleOpenMenu(entry.id)
                    }
                    className="p-2 hover:bg-purple-900/50 rounded-md transition-colors text-purple-300"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed Position Dropdown Menu */}
      {openMenuId && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseMenu}
          />

          {/* Menu - Fixed position, won't be clipped by overflow containers */}
          <div
            className="fixed z-50 w-48 bg-[#1a1a2e] border border-purple-500/30 rounded-lg shadow-xl overflow-hidden"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
          >
            <button
              onClick={() => {
                const entry = entries.find(e => e.id === openMenuId);
                if (entry) handleView(entry);
              }}
              className="w-full px-4 py-3 text-left text-sm text-white hover:bg-purple-900/30 transition-colors flex items-center gap-3"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
            <button
              onClick={() => {
                const entry = entries.find(e => e.id === openMenuId);
                if (entry) handleEdit(entry);
              }}
              className="w-full px-4 py-3 text-left text-sm text-white hover:bg-purple-900/30 transition-colors flex items-center gap-3 border-t border-purple-500/20"
            >
              <Edit2 className="w-4 h-4" />
              Edit Entry
            </button>
            <button
              onClick={() => {
                const entry = entries.find(e => e.id === openMenuId);
                if (entry) handleDelete(entry);
              }}
              className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-3 border-t border-purple-500/20"
            >
              <Trash2 className="w-4 h-4" />
              Delete Entry
            </button>
          </div>
        </>
      )}

      {/* Modals */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          categories={categories}
          onSuccess={onRefresh}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {deletingEntry && (
        <DeleteEntryDialog
          entry={deletingEntry}
          categories={categories}
          onSuccess={onRefresh}
          onClose={() => setDeletingEntry(null)}
        />
      )}

      {viewingEntry && (
        <EntryDetailsModal
          entry={viewingEntry}
          categories={categories}
          onEdit={() => setEditingEntry(viewingEntry)}
          onDelete={() => setDeletingEntry(viewingEntry)}
          onClose={() => setViewingEntry(null)}
        />
      )}
    </>
  );
}
