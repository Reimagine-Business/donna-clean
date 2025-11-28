'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import { createEntry, type Category, type EntryType, type PaymentMethodType } from '@/app/entries/actions'
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast'
import {
  validateAmount,
  validateDate,
  validateType,
  validateCategory,
  validateDescription,
  validateNotes,
  validatePaymentMethod
} from '@/lib/validation'

interface CreateEntryModalProps {
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

export function CreateEntryModal({ categories, onSuccess, onClose }: CreateEntryModalProps) {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<EntryType>('income')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | ''>('')
  const [notes, setNotes] = useState('')

  // Validation errors
  const [errors, setErrors] = useState<{
    type?: string
    category?: string
    amount?: string
    description?: string
    date?: string
    paymentMethod?: string
    notes?: string
  }>({})

  // Filter categories based on selected type
  const filteredCategories = categories.filter(cat => cat.type === type)

  // Reset category when type changes
  useEffect(() => {
    setCategory('')
  }, [type])

  // Set default category when filtered categories change
  useEffect(() => {
    if (filteredCategories.length > 0 && !category) {
      setCategory(filteredCategories[0].name)
    }
  }, [filteredCategories, category])

  // Validation handlers
  const handleTypeChange = (newType: EntryType) => {
    setType(newType)
    const validation = validateType(newType)
    setErrors(prev => ({ ...prev, type: validation.isValid ? undefined : validation.error }))
  }

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    const validation = validateCategory(newCategory)
    setErrors(prev => ({ ...prev, category: validation.isValid ? undefined : validation.error }))
  }

  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount)
    const validation = validateAmount(newAmount)
    setErrors(prev => ({ ...prev, amount: validation.isValid ? undefined : validation.error }))
  }

  const handleDescriptionChange = (newDescription: string) => {
    setDescription(newDescription)
    const validation = validateDescription(newDescription)
    setErrors(prev => ({ ...prev, description: validation.isValid ? undefined : validation.error }))
  }

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    const validation = validateDate(newDate)
    setErrors(prev => ({ ...prev, date: validation.isValid ? undefined : validation.error }))
  }

  const handlePaymentMethodChange = (newMethod: PaymentMethodType | '') => {
    setPaymentMethod(newMethod)
    const validation = validatePaymentMethod(newMethod || undefined)
    setErrors(prev => ({ ...prev, paymentMethod: validation.isValid ? undefined : validation.error }))
  }

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes)
    const validation = validateNotes(newNotes)
    setErrors(prev => ({ ...prev, notes: validation.isValid ? undefined : validation.error }))
  }

  // Check if form is valid
  const isFormValid = () => {
    return (
      !errors.type &&
      !errors.category &&
      !errors.amount &&
      !errors.description &&
      !errors.date &&
      !errors.paymentMethod &&
      !errors.notes &&
      type &&
      category &&
      amount &&
      date
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Run all validations
    const typeValidation = validateType(type)
    const categoryValidation = validateCategory(category)
    const amountValidation = validateAmount(amount)
    const descriptionValidation = validateDescription(description)
    const dateValidation = validateDate(date)
    const paymentMethodValidation = validatePaymentMethod(paymentMethod || undefined)
    const notesValidation = validateNotes(notes)

    // Update errors
    setErrors({
      type: typeValidation.isValid ? undefined : typeValidation.error,
      category: categoryValidation.isValid ? undefined : categoryValidation.error,
      amount: amountValidation.isValid ? undefined : amountValidation.error,
      description: descriptionValidation.isValid ? undefined : descriptionValidation.error,
      date: dateValidation.isValid ? undefined : dateValidation.error,
      paymentMethod: paymentMethodValidation.isValid ? undefined : paymentMethodValidation.error,
      notes: notesValidation.isValid ? undefined : notesValidation.error,
    })

    // Check if any validation failed
    if (!typeValidation.isValid) {
      showError(typeValidation.error || 'Invalid entry type')
      return
    }
    if (!categoryValidation.isValid) {
      showError(categoryValidation.error || 'Invalid category')
      return
    }
    if (!amountValidation.isValid) {
      showError(amountValidation.error || 'Invalid amount')
      return
    }
    if (!descriptionValidation.isValid) {
      showError(descriptionValidation.error || 'Invalid description')
      return
    }
    if (!dateValidation.isValid) {
      showError(dateValidation.error || 'Invalid date')
      return
    }
    if (!paymentMethodValidation.isValid) {
      showError(paymentMethodValidation.error || 'Invalid payment method')
      return
    }
    if (!notesValidation.isValid) {
      showError(notesValidation.error || 'Invalid notes')
      return
    }

    setLoading(true)

    // Show loading toast for immediate feedback
    const loadingToastId = showLoading('Adding entry...')

    try {
      const result = await createEntry({
        type,
        category,
        amount: parseFloat(amount),
        description: description || undefined,
        date,
        payment_method: paymentMethod || undefined,
        notes: notes || undefined,
      })

      // Dismiss loading toast
      dismissToast(loadingToastId)

      if (result.success) {
        showSuccess('Entry added successfully!')
        onSuccess()
        onClose()
      } else {
        showError(result.error || 'Failed to create entry')
      }
    } catch (error: unknown) {
      // Dismiss loading toast
      dismissToast(loadingToastId)
      console.error('Failed to create entry:', error)
      showError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-lg max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/30">
          <h2 className="text-xl font-semibold text-white">
            Add New Entry
          </h2>
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
                  onChange={(e) => handleTypeChange(e.target.value as EntryType)}
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
                  onChange={(e) => handleTypeChange(e.target.value as EntryType)}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="px-4 py-3 bg-purple-900/30 border-2 border-purple-500/30 rounded-lg cursor-pointer transition-all peer-checked:border-red-500 peer-checked:bg-red-900/20 text-center text-white peer-disabled:opacity-50 peer-disabled:cursor-not-allowed">
                  Expense
                </div>
              </label>
            </div>
            {errors.type && (
              <p className="mt-1 text-xs text-red-400">{errors.type}</p>
            )}
          </div>

          {/* Category Selection */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-purple-300 mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              disabled={loading || filteredCategories.length === 0}
              className={`w-full px-4 py-3 bg-purple-900/30 border ${errors.category ? 'border-red-500' : 'border-purple-500/30'} rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50`}
              required
            >
              <option value="">Select category</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-red-400">{errors.category}</p>
            )}
            {filteredCategories.length === 0 && (
              <p className="mt-1 text-xs text-red-400">
                No categories available for {type}. Please add categories first.
              </p>
            )}
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
                onChange={(e) => handleAmountChange(e.target.value)}
                disabled={loading}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                className={`w-full pl-8 pr-4 py-3 bg-purple-900/30 border ${errors.amount ? 'border-red-500' : 'border-purple-500/30'} rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50`}
                required
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-xs text-red-400">{errors.amount}</p>
            )}
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
              onChange={(e) => handleDescriptionChange(e.target.value)}
              disabled={loading}
              placeholder="Brief description"
              maxLength={500}
              className={`w-full px-4 py-3 bg-purple-900/30 border ${errors.description ? 'border-red-500' : 'border-purple-500/30'} rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-400">{errors.description}</p>
            )}
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
              onChange={(e) => handleDateChange(e.target.value)}
              disabled={loading}
              max={format(new Date(), 'yyyy-MM-dd')}
              className={`w-full px-4 py-3 bg-purple-900/30 border ${errors.date ? 'border-red-500' : 'border-purple-500/30'} rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50`}
              required
            />
            {errors.date && (
              <p className="mt-1 text-xs text-red-400">{errors.date}</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="payment-method" className="block text-sm font-medium text-purple-300 mb-2">
              Payment Method
            </label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethodType | '')}
              disabled={loading}
              className={`w-full px-4 py-3 bg-purple-900/30 border ${errors.paymentMethod ? 'border-red-500' : 'border-purple-500/30'} rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50`}
            >
              <option value="">Select payment method</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
            {errors.paymentMethod && (
              <p className="mt-1 text-xs text-red-400">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-purple-300 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              disabled={loading}
              placeholder="Additional notes..."
              rows={3}
              maxLength={1000}
              className={`w-full px-4 py-3 bg-purple-900/30 border ${errors.notes ? 'border-red-500' : 'border-purple-500/30'} rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 resize-none`}
            />
            {errors.notes && (
              <p className="mt-1 text-xs text-red-400">{errors.notes}</p>
            )}
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
              disabled={loading || filteredCategories.length === 0 || !isFormValid()}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
