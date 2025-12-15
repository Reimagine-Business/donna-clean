'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Filter, CheckSquare, Trash2, Download, X } from 'lucide-react'
import { type Entry, type Category, getEntries, getCategories, deleteEntry, createEntry, type EntryType, type CategoryType, type PaymentMethodType } from '@/app/entries/actions'
import { CreateEntryModal } from './create-entry-modal'
import { EntryList } from './entry-list'
import { EntryFiltersBar, type EntryFilters } from './entry-filters'
import { EntryListSkeleton } from '@/components/skeletons/entry-skeleton'
import { NoEntries } from '@/components/empty-states/no-entries'
import { ErrorState } from '@/components/ui/error-state'
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast'
import { SiteHeader } from '@/components/site-header'
import { TopNavMobile } from '@/components/navigation/top-nav-mobile'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { PartySelector } from './party-selector'
import { format } from 'date-fns'

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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedEntries, setSelectedEntries] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

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

  const [filters, setFilters] = useState<EntryFilters>({
    type: 'all',
    category: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  })

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

  // Debug logging
  console.log('🔍 Entry Type:', formData.entryType)
  console.log('📁 Available Categories:', availableCategories)

  // Filter entries based on filters
  const filteredEntries = useMemo(() => {
    let result = [...entries]

    // Filter by type
    if (filters.type !== 'all') {
      if (filters.type === 'in') {
        // Cash In: Cash Inflow + Advance(Sales) + Credit(Sales)
        result = result.filter(entry =>
          entry.entry_type === 'Cash IN' ||
          (entry.entry_type === 'Advance' && entry.category === 'Sales') ||
          (entry.entry_type === 'Credit' && entry.category === 'Sales')
        )
      } else if (filters.type === 'out') {
        // Cash Out: Cash Outflow + Advance(expenses) + Credit(expenses)
        result = result.filter(entry =>
          entry.entry_type === 'Cash OUT' ||
          (entry.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(entry.category)) ||
          (entry.entry_type === 'Credit' && ['COGS', 'Opex', 'Assets'].includes(entry.category))
        )
      }
    }

    // Filter by category
    if (filters.category) {
      result = result.filter(entry => entry.category === filters.category)
    }

    // Filter by date range
    if (filters.dateFrom) {
      result = result.filter(entry => entry.entry_date >= filters.dateFrom)
    }
    if (filters.dateTo) {
      result = result.filter(entry => entry.entry_date <= filters.dateTo)
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(entry =>
        entry.notes?.toLowerCase().includes(searchLower) ||
        entry.category.toLowerCase().includes(searchLower) ||
        entry.entry_type.toLowerCase().includes(searchLower)
      )
    }

    return result
  }, [entries, filters])

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
        notes: formData.notes || undefined,
      })

      dismissToast(loadingToastId)

      if (result.success) {
        showSuccess('Entry created successfully!')

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

  const handleFiltersChange = (newFilters: EntryFilters) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Bulk operations handlers
  const handleToggleBulkMode = () => {
    setBulkMode(!bulkMode)
    setSelectedEntries([])
  }

  const handleSelectEntry = (id: string) => {
    setSelectedEntries(prev =>
      prev.includes(id)
        ? prev.filter(entryId => entryId !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedEntries.length === paginatedEntries.length) {
      setSelectedEntries([])
    } else {
      setSelectedEntries(paginatedEntries.map(entry => entry.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedEntries.length === 0) {
      showError('No entries selected')
      return
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedEntries.length} ${
        selectedEntries.length === 1 ? 'entry' : 'entries'
      }? This action cannot be undone.`
    )

    if (!confirmed) return

    setBulkDeleting(true)

    try {
      const deletePromises = selectedEntries.map(id => deleteEntry(id))
      const results = await Promise.all(deletePromises)

      const failedCount = results.filter(r => !r.success).length
      const successCount = results.filter(r => r.success).length

      if (successCount > 0) {
        showSuccess(`Successfully deleted ${successCount} ${successCount === 1 ? 'entry' : 'entries'}`)
        await handleRefresh()
        setSelectedEntries([])
        setBulkMode(false)
      }

      if (failedCount > 0) {
        showError(`Failed to delete ${failedCount} ${failedCount === 1 ? 'entry' : 'entries'}`)
      }
    } catch (error: unknown) {
      console.error('Bulk delete failed:', error)
      showError('An error occurred during bulk delete')
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkExport = () => {
    if (selectedEntries.length === 0) {
      showError('No entries selected')
      return
    }

    const selectedData = entries.filter(entry => selectedEntries.includes(entry.id))
    const csvContent = [
      ['Date', 'Entry Type', 'Category', 'Amount', 'Payment Method', 'Notes'].join(','),
      ...selectedData.map(entry =>
        [
          entry.entry_date,
          entry.entry_type,
          entry.category,
          entry.amount,
          entry.payment_method || '',
          `"${(entry.notes || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `entries-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    showSuccess(`Exported ${selectedEntries.length} ${selectedEntries.length === 1 ? 'entry' : 'entries'}`)
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

  // Show empty state
  if (!loading && entries.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
        <div className="flex flex-col min-h-screen">
          <SiteHeader />
          <TopNavMobile />

          <section className="flex-1 px-4 py-4 md:px-8 overflow-auto">
            <div className="mx-auto w-full max-w-6xl">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">Record what happen!</h1>
              </div>
              <NoEntries onAddEntry={() => setShowCreateModal(true)} />
            </div>
          </section>
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 rounded-full shadow-lg flex items-center justify-center text-white transition-colors z-40"
          title="Add Entry"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Create Modal */}
        {showCreateModal && (
          <CreateEntryModal
            categories={allCategories}
            onSuccess={handleRefresh}
            onClose={() => setShowCreateModal(false)}
          />
        )}

        <BottomNav />
      </main>
    )
  }

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
            <p className="text-sm text-purple-300 mt-1">
              {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
              {filters.type !== 'all' && ` • ${filters.type}`}
              {bulkMode && selectedEntries.length > 0 && ` • ${selectedEntries.length} selected`}
            </p>
          </div>
          {!showFormAtTop && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleBulkMode}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  bulkMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Select</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  showFilters
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          )}
        </div>

        {showFormAtTop ? (
          /* ========== FORM AT TOP LAYOUT ========== */
          <div className="space-y-6">
            {/* Create Form Card */}
            <div className="rounded-lg border border-purple-500/30 bg-purple-900/10 p-6">
              <h2 className="text-xl font-semibold mb-4">Add New Entry</h2>

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
                      disabled={submitting}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                      <option value="None">None</option>
                    </select>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent Entries</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleBulkMode}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      bulkMode
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Select</span>
                  </button>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      showFilters
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                  </button>
                </div>
              </div>

        {/* Bulk Action Bar */}
        {bulkMode && (
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-purple-300 hover:text-white transition-colors"
                >
                  {selectedEntries.length === paginatedEntries.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-purple-400">
                  {selectedEntries.length} of {paginatedEntries.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkExport}
                  disabled={selectedEntries.length === 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedEntries.length === 0 || bulkDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {bulkDeleting ? 'Deleting...' : 'Delete'}
                  </span>
                </button>
                <button
                  onClick={handleToggleBulkMode}
                  className="px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <EntryFiltersBar
            filters={filters}
            categories={allCategories}
            onFiltersChange={handleFiltersChange}
          />
        )}

        {/* Loading State */}
        {loading && <EntryListSkeleton />}

        {/* Entry List */}
        {!loading && filteredEntries.length === 0 && (
          <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-8 text-center">
            <p className="text-purple-300">No entries match your filters</p>
            <button
              onClick={() => handleFiltersChange({
                type: 'all',
                category: '',
                dateFrom: '',
                dateTo: '',
                search: '',
              })}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {!loading && paginatedEntries.length > 0 && (
          <EntryList
            entries={paginatedEntries}
            categories={allCategories}
            onRefresh={handleRefresh}
            selectedEntries={selectedEntries}
            onSelectEntry={handleSelectEntry}
            bulkMode={bulkMode}
          />
        )}

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
        ) : (
          /* ========== MODAL LAYOUT ========== */
          <div className="space-y-6">
            {/* Entry List Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent Entries</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleBulkMode}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      bulkMode
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Select</span>
                  </button>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      showFilters
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                  </button>
                </div>
              </div>

              {/* Bulk Action Bar */}
              {bulkMode && (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-purple-300 hover:text-white transition-colors"
                      >
                        {selectedEntries.length === paginatedEntries.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <span className="text-sm text-purple-400">
                        {selectedEntries.length} of {paginatedEntries.length} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleBulkExport}
                        disabled={selectedEntries.length === 0}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        disabled={selectedEntries.length === 0 || bulkDeleting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {bulkDeleting ? 'Deleting...' : 'Delete'}
                        </span>
                      </button>
                      <button
                        onClick={handleToggleBulkMode}
                        className="px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">Cancel</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              {showFilters && (
                <EntryFiltersBar
                  filters={filters}
                  categories={allCategories}
                  onFiltersChange={handleFiltersChange}
                />
              )}

              {/* Loading State */}
              {loading && <EntryListSkeleton />}

              {/* Entry List */}
              {!loading && filteredEntries.length === 0 && (
                <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-8 text-center">
                  <p className="text-purple-300">No entries match your filters</p>
                  <button
                    onClick={() => handleFiltersChange({
                      type: 'all',
                      category: '',
                      dateFrom: '',
                      dateTo: '',
                      search: '',
                    })}
                    className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}

              {!loading && paginatedEntries.length > 0 && (
                <EntryList
                  entries={paginatedEntries}
                  categories={allCategories}
                  onRefresh={handleRefresh}
                  selectedEntries={selectedEntries}
                  onSelectEntry={handleSelectEntry}
                  bulkMode={bulkMode}
                />
              )}

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
        )}
          </div>
        </section>
      </div>

      {/* Floating Action Button - only in modal mode */}
      {!showFormAtTop && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 rounded-full shadow-lg flex items-center justify-center text-white transition-colors z-40"
          title="Add Entry"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Create Modal - only in modal mode */}
      {!showFormAtTop && showCreateModal && (
        <CreateEntryModal
          categories={allCategories}
          onSuccess={handleRefresh}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      <BottomNav />
    </main>
  )
}
