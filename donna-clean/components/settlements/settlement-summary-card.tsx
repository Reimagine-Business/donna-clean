'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { SettlementModal } from './settlement-modal'

interface SettlementSummaryCardProps {
  type: 'collections' | 'bills' | 'advances'
  count: number
  amount: number
  items: any[]
  onSettle: (item: any) => void
}

export function SettlementSummaryCard({
  type,
  count,
  amount,
  items,
  onSettle
}: SettlementSummaryCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'paid' | 'received'>('paid')

  const config = {
    collections: {
      title: 'PENDING COLLECTIONS',
      icon: '💰',
      leftLabel: 'No of Pending',
      rightLabel: 'Amount to Collect',
      buttonText: 'Settle Collections'
    },
    bills: {
      title: 'PENDING BILLS',
      icon: '📄',
      leftLabel: 'No of Pending',
      rightLabel: 'Amount Due',
      buttonText: 'Settle Bills'
    },
    advances: {
      title: 'ADVANCES',
      icon: '🔄',
      leftLabel: 'Advance Paid',
      rightLabel: 'Advance Received',
      buttonText: 'Settle Advance'
    }
  }

  const cfg = config[type]

  // For advances, split items by type
  const advancePaid = type === 'advances'
    ? items.filter(i => i.entry_type === 'Cash Outflow' || (i.entry_type === 'Advance'))
    : []
  const advanceReceived = type === 'advances'
    ? items.filter(i => i.entry_type === 'Cash Inflow' && i.category === 'Assets')
    : []

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt)
  }

  return (
    <>
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{cfg.icon}</span>
          <h3 className="text-white font-semibold text-sm uppercase tracking-wide">
            {cfg.title}
          </h3>
        </div>

        {/* Summary Grid */}
        {type === 'advances' ? (
          // Advances: Split view
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-purple-300 text-xs mb-1">{cfg.leftLabel}</p>
              <p className="text-white text-lg font-bold">
                {advancePaid.length}
                <span className="text-purple-300 text-sm ml-1">|</span>
                <span className="text-white text-base ml-1">
                  {formatAmount(advancePaid.reduce((sum, i) => sum + (i.remaining_amount || i.amount), 0))}
                </span>
              </p>
            </div>
            <div>
              <p className="text-purple-300 text-xs mb-1">{cfg.rightLabel}</p>
              <p className="text-white text-lg font-bold">
                {advanceReceived.length}
                <span className="text-purple-300 text-sm ml-1">|</span>
                <span className="text-white text-base ml-1">
                  {formatAmount(advanceReceived.reduce((sum, i) => sum + (i.remaining_amount || i.amount), 0))}
                </span>
              </p>
            </div>
          </div>
        ) : (
          // Collections/Bills: Standard view
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-purple-300 text-xs mb-1">{cfg.leftLabel}</p>
              <p className="text-white text-3xl font-bold">{count}</p>
            </div>
            <div>
              <p className="text-purple-300 text-xs mb-1 text-right">{cfg.rightLabel}</p>
              <p className="text-white text-2xl font-bold text-right">
                {formatAmount(amount)}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {type === 'advances' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setSelectedTab('paid')
                setModalOpen(true)
              }}
              disabled={advancePaid.length === 0}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              {cfg.buttonText}
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedTab('received')
                setModalOpen(true)
              }}
              disabled={advanceReceived.length === 0}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              {cfg.buttonText}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            disabled={count === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
          >
            {cfg.buttonText}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <SettlementModal
          type={type}
          title={type === 'advances'
            ? selectedTab === 'paid' ? 'Advance Paid' : 'Advance Received'
            : cfg.title
          }
          items={type === 'advances'
            ? selectedTab === 'paid' ? advancePaid : advanceReceived
            : items
          }
          onSettle={onSettle}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
