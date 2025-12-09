import { Suspense } from 'react'
import { getEntries, getCategories } from './actions'
import { EntriesShell } from '@/components/entries/entries-shell'
import { EntryListSkeleton } from '@/components/skeletons/entry-skeleton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EntriesPage() {
  const [entriesResult, categoriesResult] = await Promise.all([
    getEntries(),
    getCategories(),
  ])

  return (
    <Suspense fallback={<EntryListSkeleton />}>
      <EntriesShell
        initialEntries={entriesResult.entries}
        categories={categoriesResult.categories}
        error={entriesResult.error || categoriesResult.error}
      />
    </Suspense>
  )
}
