'use client'

import { useState, useMemo } from 'react'
import { Plus, Filter } from 'lucide-react'
import { type Entry, type Category, getEntries, getCategories } from '@/app/entries/actions'
import { CreateEntryModal } from './create-entry-modal'
import { EntryList } from './entry-list'
import { EntryFiltersBar, type EntryFilters } from './entry-filters'
import { EntryListSkeleton } from '@/components/skeletons/entry-skeleton'
import { NoEntries } from '@/components/empty-states/no-entries'
import { ErrorState } from '@/components/ui/error-state'

interface EntriesShellProps {
  initialEntries: Entry[]
  categories: Category[]
  error: string | null
}

const ITEMS_PER_PAGE = 20

export function EntriesShell({ initialEntries, categories, error: initialError }: EntriesShellProps) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [allCategories, setAllCategories] = useState<Category[]>(categories)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const [filters, setFilters] = useState<EntryFilters>({
    type: 'all',
    category: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  })

  // Filter entries based on filters
  const filteredEntries = useMemo(() => {
    let result = [...entries]

    // Filter by type
    if (filters.type !== 'all') {
      result = result.filter(entry => entry.type === filters.type)
    }

    // Filter by category
    if (filters.category) {
      result = result.filter(entry => entry.category === filters.category)
    }

    // Filter by date range
    if (filters.dateFrom) {
      result = result.filter(entry => entry.date >= filters.dateFrom)
    }
    if (filters.dateTo) {
      result = result.filter(entry => entry.date <= filters.dateTo)
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(entry =>
        entry.description?.toLowerCase().includes(searchLower) ||
        entry.notes?.toLowerCase().includes(searchLower) ||
        entry.category.toLowerCase().includes(searchLower)
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

      if (!categoriesResult.error) {
        setAllCategories(categoriesResult.categories)
      }
    } catch (err: any) {
      console.error('Failed to refresh data:', err)
      setError(err.message || 'Failed to refresh data')
    } finally {
      setLoading(false)
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

  // Show error state
  if (error && entries.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
        <div className="flex-1 p-4 md:p-6">
          <ErrorState
            title="Failed to load entries"
            message={error}
            onRetry={handleRefresh}
          />
        </div>
      </div>
    )
  }

  // Show empty state
  if (!loading && entries.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
        <div className="flex-1 p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Entries</h1>
          </div>
          <NoEntries onAddEntry={() => setShowCreateModal(true)} />
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
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Entries</h1>
            <p className="text-sm text-purple-300 mt-1">
              {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
              {filters.type !== 'all' && ` • ${filters.type}`}
            </p>
          </div>
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
    </div>
  )
}
