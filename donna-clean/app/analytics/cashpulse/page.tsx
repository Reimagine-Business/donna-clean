import { Suspense } from 'react'
import { getEntries } from '@/app/entries/actions'
import { CashPulseAnalytics } from '@/components/analytics/cash-pulse-analytics'
import { EntryListSkeleton } from '@/components/skeletons/entry-skeleton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CashPulseAnalyticsPage() {
  const { entries } = await getEntries()

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
      <div className="container mx-auto p-4 md:p-6">
        <Suspense fallback={<EntryListSkeleton />}>
          <CashPulseAnalytics entries={entries} />
        </Suspense>
      </div>
    </div>
  )
}
