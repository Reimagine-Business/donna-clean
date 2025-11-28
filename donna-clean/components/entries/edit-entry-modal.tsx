'use client'

import { useState, useEffect } from 'react'
import { X, Clock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { updateEntry, type Entry, type Category, type EntryType, type PaymentMethodType } from '@/app/entries/actions'
import { showSuccess, showError } from '@/lib/toast'

interface EditEntryModalProps {
  entry: Entry
  categories: Category[]
  onSuccess: () => void
  onClose: () => void
}

const PAYMENT_METHODS: { value: PaymentMethodType; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

export function EditEntryModal({ entry, categories, onSuccess, onClose }: EditEntryModalProps) {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<EntryType>(entry.type)
  const [category, setCategory] = useState(entry.category)
  const [amount, setAmount] = useState(entry.amount.toString())
  const [description, setDescription] = useState(entry.description || '')
  const [date, setDate] = useState(entry.date)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | ''>(entry.payment_method || '')
  const [notes, setNotes] = useState(entry.notes || '')

  // Filter categories based on selected type
  const filteredCategories = categories.filter(cat => cat.type === type)

  // Reset category when type changes if current category doesn't match new type
  useEffect(() => {
    const categoryExists = filteredCategories.some(cat => cat.name === category)
    if (!categoryExists && filteredCategories.length > 0) {
      setCategory(filteredCategories[0].name)
    }
  }, [type, filteredCategories, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!type) {
      showError('Please select entry type')
      return
    }

    if (!category) {
      showError('Please select a category')
      return
    }

    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      showError('Amount must be a positive number')
      return
    }

    if (!date) {
      showError('Please select a date')
      return
    }

    // Check if date is in future
    const entryDate = new Date(date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    if (entryDate > today) {
      showError('Date cannot be in the future')
      return
    }

    setLoading(true)

    try {
      const result = await updateEntry(entry.id, {
        type,
        category,
        amount: amountNum,
        description: description || undefined,
        date,
        payment_method: paymentMethod || undefined,
        notes: notes || undefined,
      })

      if (result.success) {
        showSuccess('Entry updated successfully!')
        onSuccess()
        onClose()
      } else {
        showError(result.error || 'Failed to update entry')
      }
    } catch (error: any) {
      console.error('Failed to update entry:', error)
      showError(error.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const lastUpdated = formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true })

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-lg max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/30">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Edit Entry
            </h2>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-purple-400">
              <Clock className="w-3 h-3" />
              <span>Last updated {lastUpdated}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-purple-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">
              Type <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex-1">
                <input
                  type="radio"
                  name="type"
                  value="income"
                  checked={type === 'income'}
                  onChange={(e) => setType(e.target.value as EntryType)}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="px-4 py-3 bg-purple-900/30 border-2 border-purple-500/30 rounded-lg cursor-pointer transition-all peer-checked:border-green-500 peer-checked:bg-green-900/20 text-center text-white peer-disabled:opacity-50 peer-disabled:cursor-not-allowed">
                  Income
                </div>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  checked={type === 'expense'}
                  onChange={(e) => setType(e.target.value as EntryType)}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="px-4 py-3 bg-purple-900/30 border-2 border-purple-500/30 rounded-lg cursor-pointer transition-all peer-checked:border-red-500 peer-checked:bg-red-900/20 text-center text-white peer-disabled:opacity-50 peer-disabled:cursor-not-allowed">
                  Expense
                </div>
              </label>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-purple-300 mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading || filteredCategories.length === 0}
              className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              required
            >
              <option value="">Select category</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-purple-300 mb-2">
              Amount <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                ₹
              </span>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                className="w-full pl-8 pr-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-purple-300 mb-2">
              Description
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder="Brief description"
              className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-purple-300 mb-2">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="payment-method" className="block text-sm font-medium text-purple-300 mb-2">
              Payment Method
            </label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType | '')}
              disabled={loading}
              className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              <option value="">Select payment method</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-purple-300 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              placeholder="Additional notes..."
              rows={3}
              className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-purple-500/30">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-purple-900/30 hover:bg-purple-900/50 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || filteredCategories.length === 0}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
