"use client";

import { useState } from "react";
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
  selectedEntries?: string[];
  onSelectEntry?: (id: string) => void;
  bulkMode?: boolean;
}

export function EntryList({
  entries,
  categories,
  onRefresh,
  selectedEntries = [],
  onSelectEntry,
  bulkMode = false,
}: EntryListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);

  const handleCloseMenu = () => setOpenMenuId(null);

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
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-purple-900/10 border border-purple-500/20 rounded-lg">
        <p className="text-purple-300">No entries found</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-purple-500/30 bg-purple-900/5 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[auto_auto_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-purple-900/20 border-b border-purple-500/30 font-medium text-sm text-purple-200">
          {bulkMode && <div className="w-8"></div>}
          <div className="text-left">DATE</div>
          <div className="text-left">ENTRY TYPE</div>
          <div className="text-left">CATEGORY</div>
          <div className="text-right">AMOUNT</div>
          <div className="text-left">PAYMENT</div>
          <div className="w-10"></div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-purple-500/20">
          {entries.map((entry) => {
            const isIncome =
              entry.entry_type === "Cash IN" ||
              (entry.entry_type === "Credit" && entry.category === "Sales") ||
              (entry.entry_type === "Advance" && entry.category === "Sales");
            const isMenuOpen = openMenuId === entry.id;
            const isSelected = selectedEntries.includes(entry.id);

            return (
              <div
                key={entry.id}
                className={`grid grid-cols-[auto_auto_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-4 hover:bg-purple-900/20 transition-colors ${
                  isSelected ? "bg-purple-900/30" : ""
                }`}
              >
                {/* Checkbox (bulk mode) */}
                {bulkMode && onSelectEntry && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectEntry(entry.id)}
                      className="w-4 h-4 rounded border-purple-500/30 bg-purple-900/30 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                  </div>
                )}

                {/* Date */}
                <div className="flex flex-col text-sm min-w-[50px]">
                  <span className="font-medium text-white">
                    {format(new Date(entry.entry_date), "dd")}
                  </span>
                  <span className="text-purple-400 text-xs">
                    {format(new Date(entry.entry_date), "MMM")}
                  </span>
                </div>

                {/* Entry Type */}
                <div className="flex items-center">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border whitespace-nowrap ${getEntryTypeColor(
                      entry.entry_type
                    )}`}
                  >
                    {entry.entry_type}
                  </span>
                </div>

                {/* Category */}
                <div className="text-sm text-white flex items-center">
                  {entry.category}
                </div>

                {/* Amount */}
                <div
                  className={`text-right font-medium flex items-center justify-end ${
                    isIncome ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isIncome ? "+" : "-"} {formatCurrency(entry.amount)}
                </div>

                {/* Payment Method */}
                <div className="text-sm flex items-center">
                  {entry.payment_method && (
                    <span className="px-2 py-1 rounded bg-purple-900/30 text-purple-300 text-xs border border-purple-500/30">
                      {entry.payment_method}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end">
                  {!bulkMode && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenuId(isMenuOpen ? null : entry.id)
                        }
                        className="p-2 hover:bg-purple-900/50 rounded-md transition-colors text-purple-300"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <>
                          {/* Backdrop to close menu */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={handleCloseMenu}
                          />

                          {/* Menu */}
                          <div className="absolute right-0 top-10 z-20 w-48 bg-[#1a1a2e] border border-purple-500/30 rounded-lg shadow-lg overflow-hidden">
                            <button
                              onClick={() => handleView(entry)}
                              className="w-full px-4 py-3 text-left text-sm text-white hover:bg-purple-900/30 transition-colors flex items-center gap-3"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => handleEdit(entry)}
                              className="w-full px-4 py-3 text-left text-sm text-white hover:bg-purple-900/30 transition-colors flex items-center gap-3 border-t border-purple-500/20"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit Entry
                            </button>
                            <button
                              onClick={() => handleDelete(entry)}
                              className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-3 border-t border-purple-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Entry
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
