import { Skeleton } from "@/components/ui/skeleton"

export function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      {/* Logo and Business Info */}
      <div className="flex flex-col items-center gap-4 pb-6 border-b border-purple-500/20">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Profile Fields */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4"
          >
            <div className="flex items-center gap-4">
              {/* Icon placeholder */}
              <Skeleton className="w-5 h-5 rounded" />

              <div className="flex-1 space-y-2">
                {/* Label placeholder */}
                <Skeleton className="h-4 w-24" />
                {/* Value placeholder */}
                <Skeleton className="h-6 w-full max-w-xs" />
              </div>

              {/* Edit button placeholder */}
              <Skeleton className="w-20 h-9 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
