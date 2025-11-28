import { Suspense } from 'react'
import { getAlerts, getAlertCounts } from './actions'
import { NotificationsShell } from '@/components/notifications/notifications-shell'
import { EntryListSkeleton } from '@/components/skeletons/entry-skeleton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NotificationsPage() {
  const [{ alerts }, counts] = await Promise.all([
    getAlerts(),
    getAlertCounts(),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
      <div className="container mx-auto p-4 md:p-6">
        <Suspense fallback={<EntryListSkeleton />}>
          <NotificationsShell
            initialAlerts={alerts}
            counts={counts}
            onRefresh={() => window.location.reload()}
          />
        </Suspense>
      </div>
    </div>
  )
}
