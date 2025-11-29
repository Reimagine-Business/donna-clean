'use client'

import { X, Edit2, Trash2, Calendar, CreditCard, FileText, StickyNote, Clock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { type Entry, type Category } from '@/app/entries/actions'

interface EntryDetailsModalProps {
  entry: Entry
  categories: Category[]
  onEdit: () => void
  onDelete: () => void
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

export function EntryDetailsModal({ entry, categories, onEdit, onDelete, onClose }: EntryDetailsModalProps) {
  const categoryDetails = getCategoryDetails(entry.category, categories)
  const isIncome = entry.entry_type === 'Cash Inflow' || (entry.entry_type === 'Advance' && entry.category === 'Sales')

  const createdAt = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })
  const updatedAt = formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true })

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-lg max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/30">
          <h2 className="text-xl font-semibold text-white">
            Entry Details
          </h2>
          <button
            onClick={onClose}
            className="text-purple-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Type and Category */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                isIncome
                  ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                  : 'bg-red-900/30 text-red-400 border border-red-500/30'
              }`}
            >
              {isIncome ? 'INCOME' : 'EXPENSE'}
            </span>
            <span
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
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

          {/* Amount - Large Display */}
          <div className="text-center py-6 bg-purple-900/10 border border-purple-500/20 rounded-lg">
            <div className="text-sm text-purple-400 mb-2">Amount</div>
            <div className={`text-4xl font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
              {isIncome ? '+' : '-'} {formatIndianCurrency(entry.amount)}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Date</span>
              </div>
              <div className="text-white">
                {format(new Date(entry.entry_date), 'EEEE, dd MMMM yyyy')}
              </div>
            </div>

            {/* Payment Method */}
            {entry.payment_method && (
              <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm font-medium">Payment Method</span>
                </div>
                <div className="text-white uppercase">
                  {entry.payment_method}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {entry.notes && (
            <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Notes</span>
              </div>
              <div className="text-white">
                {entry.notes}
              </div>
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <StickyNote className="w-4 h-4" />
                <span className="text-sm font-medium">Notes</span>
              </div>
              <div className="text-white whitespace-pre-wrap">
                {entry.notes}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center justify-between text-xs text-purple-400 pt-4 border-t border-purple-500/20">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Created {createdAt}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Updated {updatedAt}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-purple-500/30">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-purple-900/30 hover:bg-purple-900/50 text-white rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose()
              onEdit()
            }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => {
              onClose()
              onDelete()
            }}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
