'use client'

import { useState, useEffect } from 'react'
import { getEntries } from '@/app/entries/actions'

export default function DiagnosticsPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { entries } = await getEntries()
    setEntries(entries)
    calculateStats(entries)
    setLoading(false)
  }

  const calculateStats = (entries: any[]) => {
    const stats = {
      total: entries.length,
      byType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      cashPulse: {
        cashIn: 0,
        cashOut: 0,
        balance: 0
      },
      profitLens: {
        revenue: 0,
        cogs: 0,
        opex: 0,
        profit: 0
      }
    }

    entries.forEach(e => {
      // Count by type
      stats.byType[e.entry_type] = (stats.byType[e.entry_type] || 0) + 1

      // Count by category
      stats.byCategory[e.category] = (stats.byCategory[e.category] || 0) + 1

      // Cash Pulse calculations
      if (e.entry_type === 'Cash IN' || (e.entry_type === 'Advance' && e.category === 'Sales')) {
        stats.cashPulse.cashIn += e.amount
      }
      if (e.entry_type === 'Cash OUT' || (e.entry_type === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(e.category))) {
        stats.cashPulse.cashOut += e.amount
      }

      // Profit Lens calculations
      if (e.category === 'Sales' && (e.entry_type === 'Cash IN' || e.entry_type === 'Credit' || (e.entry_type === 'Advance' && e.settled))) {
        stats.profitLens.revenue += e.amount
      }
      if (e.category === 'COGS' && (e.entry_type === 'Cash OUT' || e.entry_type === 'Credit' || (e.entry_type === 'Advance' && e.settled))) {
        stats.profitLens.cogs += e.amount
      }
      if (e.category === 'Opex' && (e.entry_type === 'Cash OUT' || e.entry_type === 'Credit' || (e.entry_type === 'Advance' && e.settled))) {
        stats.profitLens.opex += e.amount
      }
    })

    stats.cashPulse.balance = stats.cashPulse.cashIn - stats.cashPulse.cashOut
    stats.profitLens.profit = stats.profitLens.revenue - stats.profitLens.cogs - stats.profitLens.opex

    setStats(stats)
  }

  if (loading) return <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Database Diagnostics</h1>

        {/* Entry Type Distribution */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Entry Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats?.byType || {}).map(([type, count]) => (
              <div key={type} className="bg-purple-900/30 p-4 rounded">
                <div className="text-sm text-purple-300">{type}</div>
                <div className="text-2xl font-bold">{count as number}</div>
              </div>
            ))}
          </div>

          {(stats?.byType['Cash Inflow'] || stats?.byType['Cash Outflow']) && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded">
              <div className="font-bold text-red-400">⚠️ OLD TERMINOLOGY DETECTED!</div>
              <div className="text-sm text-red-300 mt-2">
                You have {stats.byType['Cash Inflow'] || 0} "Cash Inflow" and {stats.byType['Cash Outflow'] || 0} "Cash Outflow" entries.
                <br />
                Run the migration at <a href="/admin/migrate-entry-types" className="underline">/admin/migrate-entry-types</a>
              </div>
            </div>
          )}
        </div>

        {/* Cash Pulse */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cash Pulse (Cash-basis)</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-green-300">Cash IN</div>
              <div className="text-2xl font-bold">₹{stats?.cashPulse.cashIn.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-sm text-red-300">Cash OUT</div>
              <div className="text-2xl font-bold">₹{stats?.cashPulse.cashOut.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-sm text-purple-300">Balance</div>
              <div className="text-2xl font-bold">₹{stats?.cashPulse.balance.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        {/* Profit Lens */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profit Lens (Accrual-basis)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-blue-300">Revenue</div>
              <div className="text-2xl font-bold">₹{stats?.profitLens.revenue.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-sm text-blue-300">COGS</div>
              <div className="text-2xl font-bold">₹{stats?.profitLens.cogs.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-sm text-blue-300">OpEx</div>
              <div className="text-2xl font-bold">₹{stats?.profitLens.opex.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-sm text-purple-300">Net Profit</div>
              <div className="text-2xl font-bold">₹{stats?.profitLens.profit.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Entries (Last 10)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/30">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-center p-2">Settled</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 10).map((entry) => (
                  <tr key={entry.id} className="border-b border-purple-500/10">
                    <td className="p-2">{entry.entry_date}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        entry.entry_type === 'Cash IN' ? 'bg-green-900/50' :
                        entry.entry_type === 'Cash OUT' ? 'bg-red-900/50' :
                        entry.entry_type === 'Credit' ? 'bg-blue-900/50' :
                        'bg-yellow-900/50'
                      }`}>
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className="p-2">{entry.category}</td>
                    <td className="text-right p-2">₹{entry.amount.toLocaleString('en-IN')}</td>
                    <td className="text-center p-2">{entry.settled ? '✓' : '✗'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={loadData}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg"
          >
            Refresh Data
          </button>
          <a
            href="/admin/migrate-entry-types"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Run Migration
          </a>
        </div>
      </div>
    </div>
  )
}
