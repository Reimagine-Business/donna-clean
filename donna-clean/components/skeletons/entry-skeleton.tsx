import { Skeleton } from "@/components/ui/skeleton"

export function EntrySkeleton() {
  return (
    <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Entry details */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24" /> {/* Date */}
            <Skeleton className="h-5 w-20" /> {/* Category badge */}
          </div>
          <Skeleton className="h-6 w-32" /> {/* Amount */}
          <Skeleton className="h-4 w-48" /> {/* Notes */}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded" /> {/* Edit button */}
          <Skeleton className="w-9 h-9 rounded" /> {/* Delete button */}
        </div>
      </div>
    </div>
  )
}

export function EntryListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <EntrySkeleton key={i} />
      ))}
    </div>
  )
}
