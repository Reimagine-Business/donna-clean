'use client'

import { X } from 'lucide-react'
import { type Category } from '@/app/entries/actions'

export type EntryFilters = {
  type: 'all' | 'in' | 'out'
  category: string
  dateFrom: string
  dateTo: string
  search: string
}

interface EntryFiltersBarProps {
  filters: EntryFilters
  categories: Category[]
  onFiltersChange: (filters: EntryFilters) => void
}

export function EntryFiltersBar({ filters, categories, onFiltersChange }: EntryFiltersBarProps) {
  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.category !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.search !== ''

  const handleClearFilters = () => {
    onFiltersChange({
      type: 'all',
      category: '',
      dateFrom: '',
      dateTo: '',
      search: '',
    })
  }

  return (
    <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4 space-y-4">
      {/* Type Toggle */}
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-2">
          Type
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onFiltersChange({ ...filters, type: 'all' })}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.type === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFiltersChange({ ...filters, type: 'in' })}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.type === 'in'
                ? 'bg-green-600 text-white'
                : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
            }`}
          >
            Cash In
          </button>
          <button
            onClick={() => onFiltersChange({ ...filters, type: 'out' })}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.type === 'out'
                ? 'bg-red-600 text-white'
                : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
            }`}
          >
            Cash Out
          </button>
        </div>
      </div>

      {/* Category Dropdown */}
      <div>
        <label htmlFor="category-filter" className="block text-sm font-medium text-purple-300 mb-2">
          Category
        </label>
        <select
          id="category-filter"
          value={filters.category}
          onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
          className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Categories</option>
          {categories
            .filter(cat => {
              if (filters.type === 'all') return true
              if (filters.type === 'in') return cat.type === 'income'
              if (filters.type === 'out') return cat.type === 'expense'
              return true
            })
            .map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.icon} {cat.name}
              </option>
            ))}
        </select>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date-from" className="block text-sm font-medium text-purple-300 mb-2">
            From
          </label>
          <input
            type="date"
            id="date-from"
            value={filters.dateFrom}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label htmlFor="date-to" className="block text-sm font-medium text-purple-300 mb-2">
            To
          </label>
          <input
            type="date"
            id="date-to"
            value={filters.dateTo}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
            className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Search */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-purple-300 mb-2">
          Search
        </label>
        <input
          type="text"
          id="search"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder="Search description or notes..."
          className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={handleClearFilters}
          className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Clear All Filters
        </button>
      )}
    </div>
  )
}
