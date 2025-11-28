'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { MoreVertical, Edit2, Trash2, Eye } from 'lucide-react'
import { type Entry, type Category } from '@/app/entries/actions'
import { EditEntryModal } from './edit-entry-modal'
import { DeleteEntryDialog } from './delete-entry-dialog'
import { EntryDetailsModal } from './entry-details-modal'

interface EntryListProps {
  entries: Entry[]
  categories: Category[]
  onRefresh: () => void
  selectedEntries?: string[]
  onSelectEntry?: (id: string) => void
  bulkMode?: boolean
}

// Format number in Indian numbering system
function formatIndianCurrency(amount: number): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formatter.format(amount)
}

// Get category color and icon
function getCategoryDetails(categoryName: string, categories: Category[]) {
  const category = categories.find(cat => cat.name === categoryName)
  return {
    color: category?.color || '#7c3aed',
    icon: category?.icon || '📝',
  }
}

export function EntryList({ entries, categories, onRefresh, selectedEntries = [], onSelectEntry, bulkMode = false }: EntryListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null)
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null)

  const handleCloseMenu = () => setOpenMenuId(null)

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry)
    handleCloseMenu()
  }

  const handleDelete = (entry: Entry) => {
    setDeletingEntry(entry)
    handleCloseMenu()
  }

  const handleView = (entry: Entry) => {
    setViewingEntry(entry)
    handleCloseMenu()
  }

  if (entries.length === 0) {
    return null
  }

  return (
    <>
      <div className="space-y-3">
        {entries.map((entry) => {
          const categoryDetails = getCategoryDetails(entry.category, categories)
          const isIncome = entry.type === 'income'
          const isMenuOpen = openMenuId === entry.id
          const isSelected = selectedEntries.includes(entry.id)

          return (
            <div
              key={entry.id}
              className={`bg-purple-900/10 border rounded-lg p-4 transition-colors ${
                isSelected
                  ? 'border-purple-500 bg-purple-900/20'
                  : 'border-purple-500/20 hover:border-purple-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Checkbox (bulk mode) */}
                {bulkMode && onSelectEntry && (
                  <div className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectEntry(entry.id)}
                      className="w-4 h-4 rounded border-purple-500/30 bg-purple-900/30 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                  </div>
                )}

                {/* Left side - Entry details */}
                <div
                  className="flex-1 space-y-2 cursor-pointer"
                  onClick={() => !bulkMode && handleView(entry)}
                >
                  {/* Date and Category */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-purple-400">
                      {format(new Date(entry.date), 'dd MMM yyyy')}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${categoryDetails.color}20`,
                        borderColor: `${categoryDetails.color}40`,
                        color: categoryDetails.color,
                        border: '1px solid',
                      }}
                    >
                      {categoryDetails.icon} {entry.category}
                    </span>
                    {entry.payment_method && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {entry.payment_method.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Amount */}
                  <div className={`text-2xl font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                    {isIncome ? '+' : '-'} {formatIndianCurrency(entry.amount)}
                  </div>

                  {/* Description */}
                  {entry.description && (
                    <p className="text-sm text-white">
                      {entry.description}
                    </p>
                  )}

                  {/* Notes */}
                  {entry.notes && (
                    <p className="text-xs text-purple-300 italic">
                      Note: {entry.notes}
                    </p>
                  )}
                </div>

                {/* Right side - Actions Menu */}
                {!bulkMode && (
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(isMenuOpen ? null : entry.id)}
                      className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded transition-colors"
                      title="More actions"
                    >
                      <MoreVertical className="w-4 h-4" />
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
          )
        })}
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
  )
}
