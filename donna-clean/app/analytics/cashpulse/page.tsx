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
    <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white">
      <div className="flex flex-col">
        <SiteHeader />
        <TopNavMobile />
        <div className="container mx-auto p-4 md:p-6 pb-24 md:pb-8">
          <Suspense fallback={<EntryListSkeleton />}>
            <CashPulseAnalytics entries={entries} settlementHistory={settlementHistory} />
          </Suspense>
        </div>
        <BottomNav />
      </div>
    </main>
  )
}
