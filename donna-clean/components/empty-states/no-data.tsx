import { ChartNoAxesCombined } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"

export function NoData() {
  return (
    <EmptyState
      icon={<ChartNoAxesCombined className="w-16 h-16" />}
      title="Not enough data"
      description="Add more entries to see analytics and insights"
    />
  )
}
