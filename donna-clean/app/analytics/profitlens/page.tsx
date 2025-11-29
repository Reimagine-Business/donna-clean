import { Suspense } from 'react'
import { getEntries } from '@/app/entries/actions'
import { ProfitLensAnalytics } from '@/components/analytics/profit-lens-analytics'
import { EntryListSkeleton } from '@/components/skeletons/entry-skeleton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProfitLensAnalyticsPage() {
  console.log('🔄 [PROFIT_LENS_PAGE] Starting page render...')

  try {
    const { entries, error } = await getEntries()

    console.log('📊 [PROFIT_LENS_PAGE] Data received from getEntries():')
    console.log('   - Entries count:', entries?.length || 0)
    console.log('   - Error:', error || 'None')

    if (error) {
      console.error('❌ [PROFIT_LENS_PAGE] Error from getEntries():', error)
      return (
        <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
          <div className="container mx-auto p-4 md:p-6">
            <div className="p-8 bg-red-900/20 border-2 border-red-500/50 rounded-lg">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Data</h2>
              <p className="text-red-200 mb-4">{error}</p>
              <a
                href="/analytics/profitlens"
                className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Retry
              </a>
            </div>
          </div>
        </div>
      )
    }

    if (!entries || entries.length === 0) {
      console.warn('⚠️ [PROFIT_LENS_PAGE] No entries found')
      console.warn('⚠️ [PROFIT_LENS_PAGE] Entries value:', entries)
    } else {
      console.log('✅ [PROFIT_LENS_PAGE] Passing', entries.length, 'entries to ProfitLensAnalytics component')
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
        <div className="container mx-auto p-4 md:p-6">
          <Suspense fallback={<EntryListSkeleton />}>
            <ProfitLensAnalytics entries={entries || []} />
          </Suspense>
        </div>
      </div>
    )
  } catch (error) {
    console.error('❌ [PROFIT_LENS_PAGE] Unexpected error in page:', error)
    console.error('❌ [PROFIT_LENS_PAGE] Error stack:', error instanceof Error ? error.stack : 'No stack')

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
        <div className="container mx-auto p-4 md:p-6">
          <div className="p-8 bg-red-900/20 border-2 border-red-500/50 rounded-lg">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Unexpected Error</h2>
            <p className="text-red-200 mb-4">
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </p>
            <a
              href="/analytics/profitlens"
              className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </a>
          </div>
        </div>
      </div>
    )
  }
}
