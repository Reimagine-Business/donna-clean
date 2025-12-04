'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { runMigration, type MigrationResult } from './actions'

export default function MigrateEntryTypesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MigrationResult | null>(null)

  const handleMigration = async () => {
    setLoading(true)
    setResult(null)

    try {
      const migrationResult = await runMigration()
      setResult(migrationResult)
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Entry Type Migration</h1>

        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Migration Details</h2>
          <p className="mb-4">This will update all database entries:</p>
          <ul className="list-disc list-inside space-y-2 mb-6">
            <li><code>'Cash Inflow'</code> → <code>'Cash IN'</code></li>
            <li><code>'Cash Outflow'</code> → <code>'Cash OUT'</code></li>
          </ul>

          <button
            onClick={handleMigration}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Running Migration...' : 'Run Migration'}
          </button>
        </div>

        {result && !result.success && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-red-400 mb-2">Error</h3>
            <p className="text-red-300">{result.error}</p>
          </div>
        )}

        {result && result.success && result.results && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-green-400 mb-4">Migration Successful!</h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Before Migration:</h4>
                <ul className="list-disc list-inside">
                  <li>Cash Inflow entries: {result.results.before.cashInflow}</li>
                  <li>Cash Outflow entries: {result.results.before.cashOutflow}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Entries Updated:</h4>
                <ul className="list-disc list-inside">
                  <li>Cash IN: {result.results.updated.cashIn} entries</li>
                  <li>Cash OUT: {result.results.updated.cashOut} entries</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">After Migration:</h4>
                <ul className="list-disc list-inside">
                  <li>Cash IN: {result.results.after.cashIN}</li>
                  <li>Cash OUT: {result.results.after.cashOUT}</li>
                  <li>Credit: {result.results.after.credit}</li>
                  <li>Advance: {result.results.after.advance}</li>
                </ul>
              </div>

              {(result.results.remaining.oldCashInflow > 0 || result.results.remaining.oldCashOutflow > 0) && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-400 mb-2">Warning:</h4>
                  <ul className="list-disc list-inside text-yellow-300">
                    {result.results.remaining.oldCashInflow > 0 && (
                      <li>Old 'Cash Inflow' entries remaining: {result.results.remaining.oldCashInflow}</li>
                    )}
                    {result.results.remaining.oldCashOutflow > 0 && (
                      <li>Old 'Cash Outflow' entries remaining: {result.results.remaining.oldCashOutflow}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
