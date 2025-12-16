import { Skeleton } from "@/components/ui/skeleton"

interface CardSkeletonProps {
  count?: number
}

export function CardSkeleton({ count = 3 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-6"
        >
          <div className="space-y-4">
            {/* Icon placeholder */}
            <Skeleton className="w-10 h-10 rounded-full" />

            {/* Title placeholder */}
            <Skeleton className="h-5 w-32" />

            {/* Value placeholder - large */}
            <Skeleton className="h-10 w-40" />

            {/* Optional subtitle */}
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
