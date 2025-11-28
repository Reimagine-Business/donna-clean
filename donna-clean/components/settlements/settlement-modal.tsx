'use client'

import { X } from 'lucide-react'

interface SettlementModalProps {
  type: string
  title: string
  items: any[]
  onSettle: (item: any) => void
  onClose: () => void
}

export function SettlementModal({
  type,
  title,
  items,
  onSettle,
  onClose
}: SettlementModalProps) {
  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-[#1a1a2e] border-t md:border border-purple-500/30 rounded-t-2xl md:rounded-lg w-full md:max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/30 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-purple-300 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Items List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 pb-32 md:pb-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-purple-300">No items to display</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const canSettle = !item.settled && (item.remaining_amount || item.amount) > 0
                return (
                  <div
                    key={item.id}
                    className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 space-y-2"
                  >
                    {/* Amount - Large and prominent */}
                    <div className="text-white font-bold text-2xl">
                      {formatAmount(item.remaining_amount || item.amount)}
                    </div>

                    {/* Category */}
                    <div className="text-purple-200 text-base font-medium">
                      {item.category}
                    </div>

                    {/* Date */}
                    <div className="text-purple-300 text-sm">
                      📅 {formatDate(item.entry_date || item.date)}
                    </div>

                    {/* Notes - IMPORTANT - Always show, even if empty */}
                    <div className="bg-purple-900/40 border border-purple-500/20 rounded-md p-3 min-h-[60px]">
                      <p className="text-xs text-purple-400 mb-1 uppercase font-semibold">Notes:</p>
                      <p className="text-white text-sm">
                        {item.notes || 'No notes added'}
                      </p>
                    </div>

                    {/* Status message if can't settle */}
                    {!canSettle && (
                      <p className="text-xs text-purple-400 italic">
                        {item.settled ? '✓ Already settled' : 'No balance remaining'}
                      </p>
                    )}

                    {/* Settle Button */}
                    <button
                      onClick={() => {
                        if (canSettle) {
                          onSettle(item)
                          onClose()
                        }
                      }}
                      disabled={!canSettle}
                      className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-semibold rounded-lg transition-colors"
                    >
                      Settle
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
