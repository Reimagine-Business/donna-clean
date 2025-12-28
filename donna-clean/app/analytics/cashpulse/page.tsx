import { Suspense } from 'react'
import { getEntries } from '@/app/entries/actions'
import { getSettlementHistory } from '@/app/settlements/settlement-history-actions'
import { CashPulseAnalytics } from '@/components/analytics/cash-pulse-analytics'
import { EntryListSkeleton } from '@/components/skeletons/entry-skeleton'
import { SiteHeader } from '@/components/site-header'
import { TopNavMobile } from '@/components/navigation/top-nav-mobile'
import { BottomNav } from '@/components/navigation/bottom-nav'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CashPulseAnalyticsPage() {
  const { entries } = await getEntries()
  const { settlementHistory } = await getSettlementHistory()

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#7c3aed] to-[#6d28d9] pb-24 md:pb-8">
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <TopNavMobile />

        <section className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-6xl">
            <Suspense fallback={<EntryListSkeleton />}>
              <CashPulseAnalytics entries={entries} settlementHistory={settlementHistory} />
            </Suspense>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  )
}
