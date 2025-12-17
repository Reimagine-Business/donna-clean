'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { deleteEntry, type Entry, type Category } from '@/app/entries/actions'
import { deleteSettlementHistory } from '@/app/settlements/settlement-history-actions'
import { showSuccess, showError } from '@/lib/toast'

interface DeleteEntryDialogProps {
  entry: Entry
  categories: Category[]
  onSuccess: () => void
  onClose: () => void
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

// Get category details
function getCategoryDetails(categoryName: string, categories: Category[]) {
  const category = categories.find(cat => cat.name === categoryName)
  return {
    color: category?.color || '#7c3aed',
    icon: category?.icon || '📝',
  }
}

export function DeleteEntryDialog({ entry, categories, onSuccess, onClose }: DeleteEntryDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const categoryDetails = getCategoryDetails(entry.category, categories)
  const isIncome = entry.entry_type === 'Cash IN' || (entry.entry_type === 'Advance' && entry.category === 'Sales')

  const handleDelete = async () => {
    setDeleting(true)

    try {
      // Check if this is a settlement entry
      const isSettlement = entry.is_settlement === true

      let result
      if (isSettlement) {
        // Use settlement-specific delete (restores original)
        result = await deleteSettlementHistory(entry.id)
      } else {
        // Use regular delete for normal entries
        result = await deleteEntry(entry.id)
      }

      if (result.success) {
        showSuccess(isSettlement
          ? 'Settlement deleted - original entry restored to pending!'
          : 'Entry deleted successfully!')
        onSuccess()
        onClose()
      } else {
        showError(result.error || 'Failed to delete entry')
      }
    } catch (error: unknown) {
      console.error('Failed to delete entry:', error)
      showError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-red-500/50 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-start gap-3 p-6 border-b border-red-500/30">
          <div className="flex-shrink-0 w-10 h-10 bg-red-900/30 border border-red-500/50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">
              Delete Entry?
            </h2>
            <p className="text-sm text-red-300 mt-1">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Entry Details */}
        <div className="p-6 space-y-4">
          <p className="text-purple-300 text-sm">
            Are you sure you want to delete this entry?
          </p>

          {/* Entry Summary Card */}
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 space-y-2">
            {/* Type and Category */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  isIncome
                    ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                    : 'bg-red-900/30 text-red-400 border border-red-500/30'
                }`}
              >
                {isIncome ? 'INCOME' : 'EXPENSE'}
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
            </div>

            {/* Amount */}
            <div className={`text-2xl font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
              {isIncome ? '+' : '-'} {formatIndianCurrency(entry.amount)}
            </div>

            {/* Date and Payment Method */}
            <div className="flex items-center gap-3 text-xs text-purple-400">
              <span>{format(new Date(entry.entry_date), 'dd MMM yyyy')}</span>
              {entry.payment_method && (
                <>
                  <span>•</span>
                  <span className="uppercase">{entry.payment_method}</span>
                </>
              )}
            </div>

            {/* Notes */}
            {entry.notes && (
              <p className="text-xs text-purple-300 italic">
                Note: {entry.notes}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-red-500/30">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-6 py-3 bg-purple-900/30 hover:bg-purple-900/50 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}
