import { Suspense } from 'react'
import { getEntries } from '@/app/entries/actions'
import { ProfitLensAnalytics } from '@/components/analytics/profit-lens-analytics'
import { EntryListSkeleton } from '@/components/skeletons/entry-skeleton'
import { SiteHeader } from '@/components/site-header'
import { TopNavMobile } from '@/components/navigation/top-nav-mobile'
import { BottomNav } from '@/components/navigation/bottom-nav'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProfitLensAnalyticsPage() {
  let entries: any[] = []
  let error: string | null = null

  try {
    const result = await getEntries()
    entries = result.entries
    error = result.error
  } catch (e) {
    console.error('❌ [PROFIT_LENS_PAGE] Fatal error:', e)
    error = e instanceof Error ? e.message : 'Failed to load data'
  }

  // Always render the page layout
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <TopNavMobile />

        <section className="flex-1 px-4 py-4 md:px-8 overflow-auto">
          <div className="mx-auto w-full max-w-6xl">
            {error ? (
              <div className="p-8 bg-red-900/20 border-2 border-red-500/50 rounded-lg">
                <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Data</h2>
                <p className="text-red-200 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Reload Page
                </button>
              </div>
            ) : (
              <ProfitLensAnalytics entries={entries} />
            )}
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  )
}
