'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Edit2, Trash2 } from 'lucide-react'
import { type Entry, type Category, deleteEntry } from '@/app/entries/actions'
import { showSuccess, showError } from '@/lib/toast'

interface EntryListProps {
  entries: Entry[]
  categories: Category[]
  onRefresh: () => void
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

export function EntryList({ entries, categories, onRefresh }: EntryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return
    }

    setDeletingId(id)

    try {
      const result = await deleteEntry(id)

      if (result.success) {
        showSuccess('Entry deleted successfully!')
        onRefresh()
      } else {
        showError(result.error || 'Failed to delete entry')
      }
    } catch (error: any) {
      console.error('Failed to delete entry:', error)
      showError(error.message || 'An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  if (entries.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const categoryDetails = getCategoryDetails(entry.category, categories)
        const isIncome = entry.type === 'income'
        const isDeleting = deletingId === entry.id

        return (
          <div
            key={entry.id}
            className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4 hover:border-purple-500/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left side - Entry details */}
              <div className="flex-1 space-y-2">
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

              {/* Right side - Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // TODO: Implement edit functionality
                    showError('Edit functionality coming soon!')
                  }}
                  disabled={isDeleting}
                  className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded transition-colors disabled:opacity-50"
                  title="Edit entry"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={isDeleting}
                  className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded transition-colors disabled:opacity-50"
                  title="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
