'use client'

import { useState, useMemo, useEffect } from 'react'
import { Download } from 'lucide-react'
import { type Entry, type Category, getEntries, getCategories, createEntry, type EntryType, type CategoryType, type PaymentMethodType } from '@/app/entries/actions'
import { EntryList } from './entry-list'
import { ErrorState } from '@/components/ui/error-state'
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast'
import { SiteHeader } from '@/components/site-header'
import { TopNavMobile } from '@/components/navigation/top-nav-mobile'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { PartySelector } from './party-selector'
import { format } from 'date-fns'
import { analytics } from '@/lib/analytics'

interface EntriesShellProps {
  initialEntries: Entry[]
  categories: Category[]
  error: string | null
  showFormAtTop?: boolean
}

const ITEMS_PER_PAGE = 20

export function EntriesShell({ initialEntries, categories, error: initialError, showFormAtTop = false }: EntriesShellProps) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [allCategories, setAllCategories] = useState<Category[]>(categories)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [currentPage, setCurrentPage] = useState(1)

  // Form state for inline form at top
  const [formData, setFormData] = useState({
    entryType: 'Cash IN' as EntryType,
    category: 'Sales' as CategoryType,
    amount: '',
    paymentMethod: 'Cash' as PaymentMethodType,
    partyId: undefined as string | undefined,
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Date filter for quick filtering
  const [dateFilter, setDateFilter] = useState('this-month')

  // Entry type filter
  const [entryTypeFilter, setEntryTypeFilter] = useState('all')

  // Category filtering logic for inline form
  const availableCategories = useMemo(() => {
    // Extract category names and filter based on entry type
    const categoryNames = allCategories.map(c => c.name as CategoryType)

    if (formData.entryType === 'Cash IN') {
      // Cash IN must use Sales category
      return categoryNames.filter(cat => cat === 'Sales')
    } else if (formData.entryType === 'Cash OUT') {
      // Cash OUT cannot use Sales category
      return categoryNames.filter(cat => cat !== 'Sales')
    } else {
      // Credit or Advance - all categories available
      return categoryNames
    }
  }, [formData.entryType, allCategories])

  // Auto-select category when entry type changes
  useEffect(() => {
    if (formData.entryType === 'Cash IN') {
      setFormData(prev => ({ ...prev, category: 'Sales' }))
    } else if (formData.entryType === 'Cash OUT' && formData.category === 'Sales') {
      setFormData(prev => ({
        ...prev,
        category: availableCategories[0] || 'COGS'
      }))
    }
  }, [formData.entryType, formData.category, availableCategories])

  // Auto-select payment method based on entry type
  useEffect(() => {
    if (formData.entryType === 'Credit') {
      // Credit entries should always use "None" payment method
      setFormData(prev => ({ ...prev, paymentMethod: 'None' }))
    } else if (formData.paymentMethod === 'None') {
      // If switching from Credit to Cash IN/OUT/Advance, change from "None" to "Cash"
      setFormData(prev => ({ ...prev, paymentMethod: 'Cash' }))
    }
  }, [formData.entryType, formData.paymentMethod])

  // Filter entries by date and entry type
  const filteredEntries = useMemo(() => {
    let result = [...entries]

    // Apply entry type filter
    if (entryTypeFilter !== 'all') {
      result = result.filter(e => e.entry_type === entryTypeFilter)
    }

    // Apply date filter
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null

    switch (dateFilter) {
      case 'this-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'this-year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'all-time':
        // No date filtering
        break
    }

    if (startDate) {
      result = result.filter(e => {
        const entryDate = new Date(e.entry_date)
        if (endDate) {
          return entryDate >= startDate && entryDate <= endDate
        }
        return entryDate >= startDate
      })
    }

    return result
  }, [entries, dateFilter, entryTypeFilter])

  // Paginate entries
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredEntries.slice(startIndex, endIndex)
  }, [filteredEntries, currentPage])

  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE)

  // Refresh data
  const handleRefresh = async () => {
    setLoading(true)
    setError(null)

    try {
      const [entriesResult, categoriesResult] = await Promise.all([
        getEntries(),
        getCategories(),
      ])

      if (entriesResult.error) {
        setError(entriesResult.error)
      } else {
        setEntries(entriesResult.entries)
      }

      if (!categoriesResult.error && categoriesResult.categories) {
        setAllCategories(categoriesResult.categories)
      }
    } catch (err: unknown) {
      console.error('Failed to refresh data:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }

  // Form submission handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError('Please enter a valid amount')
      return
    }

    setSubmitting(true)
    const loadingToastId = showLoading('Creating entry...')

    try {
      const result = await createEntry({
        entry_type: formData.entryType,
        category: formData.category,
        amount: parseFloat(formData.amount),
        entry_date: formData.date,
        payment_method: formData.paymentMethod,
        party_id: formData.partyId,
        notes: formData.notes || undefined,
      })

      dismissToast(loadingToastId)

      if (result.success) {
        showSuccess('Entry created successfully!')

        // Track analytics event
        analytics.entryCreated(formData.entryType, parseFloat(formData.amount))

        // Refresh entries
        await handleRefresh()

        // Reset form
        setFormData({
          entryType: 'Cash IN',
          category: 'Sales',
          amount: '',
          paymentMethod: 'Cash',
          partyId: undefined,
          date: format(new Date(), 'yyyy-MM-dd'),
          notes: '',
        })
      } else {
        showError(result.error || 'Failed to create entry')
      }
    } catch (error) {
      dismissToast(loadingToastId)
      showError('An unexpected error occurred')
      console.error('Create entry error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportToExcel = () => {
    // Create CSV content
    const headers = ['Date', 'Entry Type', 'Category', 'Amount', 'Payment Method', 'Notes']
    const rows = filteredEntries.map(entry => [
      format(new Date(entry.entry_date), 'dd/MM/yyyy'),
      entry.entry_type,
      entry.category,
      entry.amount.toString(),
      entry.payment_method || '',
      entry.notes || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `entries_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()

    // Track analytics event
    analytics.reportExported('entries-csv')

    showSuccess('Exported to Excel')
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Show error state
  if (error && entries.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
        <div className="flex flex-col min-h-screen">
          <SiteHeader />
          <TopNavMobile />

          <section className="flex-1 px-4 py-4 md:px-8 overflow-auto">
            <div className="mx-auto w-full max-w-6xl">
              <ErrorState
                title="Failed to load entries"
                message={error}
                onRetry={handleRefresh}
              />
            </div>
          </section>
        </div>

        <BottomNav />
      </main>
    )
  }

  // Always show the new full-page form (even for new users with 0 entries)
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <TopNavMobile />

        <section className="flex-1 px-4 py-4 md:px-8 overflow-auto">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Record what happen!</h1>
          </div>
        </div>

        {/* ========== ALWAYS SHOW FORM AT TOP ========== */}
        <div className="space-y-6">
            {/* Create Form Card */}
            <div className="rounded-lg border border-purple-500/30 bg-purple-900/10 p-6">
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Entry Type and Category Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">
                      Entry Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.entryType}
                      onChange={(e) => setFormData({ ...formData, entryType: e.target.value as EntryType })}
                      className="w-full rounded-md border border-purple-500/30 bg-purple-900/20 px-3 py-2 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      disabled={submitting}
                    >
                      <option value="Cash IN">Cash IN</option>
                      <option value="Cash OUT">Cash OUT</option>
                      <option value="Credit">Credit</option>
                      <option value="Advance">Advance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as CategoryType })}
                      className="w-full rounded-md border border-purple-500/30 bg-purple-900/20 px-3 py-2 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      disabled={availableCategories.length === 0 || submitting}
                    >
                      {availableCategories.length === 0 && (
                        <option value="">No categories available</option>
                      )}
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {formData.entryType === 'Cash IN' && (
                      <p className="text-xs text-purple-400/70 mt-1">
                        Cash IN entries must use Sales category
                      </p>
                    )}
                    {formData.entryType === 'Cash OUT' && (
                      <p className="text-xs text-purple-400/70 mt-1">
                        Cash OUT entries cannot use Sales category
                      </p>
                    )}
                  </div>
                </div>

                {/* Amount and Payment Method Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">
                      Amount (₹) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full rounded-md border border-purple-500/30 bg-purple-900/20 px-3 py-2 text-white placeholder:text-purple-400/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethodType })}
                      className="w-full rounded-md border border-purple-500/30 bg-purple-900/20 px-3 py-2 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      disabled={submitting || formData.entryType === 'Credit'}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                      <option
                        value="None"
                        disabled={formData.entryType === 'Cash IN' || formData.entryType === 'Cash OUT' || formData.entryType === 'Advance'}
                      >
                        None
                      </option>
                    </select>
                    {formData.entryType === 'Credit' && (
                      <p className="text-xs text-purple-400/70 mt-1">
                        Credit entries use "None" payment method
                      </p>
                    )}
                  </div>
                </div>

                {/* Party Selector (conditionally shown based on entry type) */}
                <PartySelector
                  entryType={formData.entryType}
                  category={formData.category}
                  value={formData.partyId}
                  onChange={(partyId) => setFormData({ ...formData, partyId })}
                  required={formData.entryType === 'Credit' || formData.entryType === 'Advance'}
                />

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full rounded-md border border-purple-500/30 bg-purple-900/20 px-3 py-2 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    disabled={submitting}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Notes
                  </label>
                  <textarea
                    placeholder="Add quick context (optional)"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-md border border-purple-500/30 bg-purple-900/20 px-3 py-2 text-white placeholder:text-purple-400/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none"
                    disabled={submitting}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !formData.amount}
                  className="w-full md:w-auto px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
                >
                  {submitting ? 'Recording...' : 'Record Daily Entry'}
                </button>
              </form>
            </div>

            {/* Entry List Section */}
            <div>
              {/* Simple Header - Date + Export Only */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base md:text-xl font-semibold text-white">Transaction History</h2>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Entry Type Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-purple-400">Type:</span>
                    <select
                      value={entryTypeFilter}
                      onChange={(e) => setEntryTypeFilter(e.target.value)}
                      className="px-2 py-1 rounded-md border border-purple-500/30 bg-purple-900/20 text-white text-xs focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="all">All Types</option>
                      <option value="Cash IN">Cash IN</option>
                      <option value="Cash OUT">Cash OUT</option>
                      <option value="Credit">Credit</option>
                      <option value="Advance">Advance</option>
                      <option value="Credit Settlement (Collections)">Credit Settlement (Collections)</option>
                      <option value="Credit Settlement (Bills)">Credit Settlement (Bills)</option>
                      <option value="Advance Settlement (Received)">Advance Settlement (Received)</option>
                      <option value="Advance Settlement (Paid)">Advance Settlement (Paid)</option>
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-purple-400">Date:</span>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="px-2 py-1 rounded-md border border-purple-500/30 bg-purple-900/20 text-white text-xs focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="this-month">This Month</option>
                      <option value="last-month">Last Month</option>
                      <option value="this-year">This Year</option>
                      <option value="all-time">All Time</option>
                    </select>
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={handleExportToExcel}
                    className="px-2.5 py-1 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Entry List with Fixed Alignment */}
              <EntryList
                entries={paginatedEntries}
                categories={allCategories}
                onRefresh={handleRefresh}
              />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-purple-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
            </div>
          </div>
        </div>
        </section>
      </div>

      <BottomNav />
    </main>
  )
}
