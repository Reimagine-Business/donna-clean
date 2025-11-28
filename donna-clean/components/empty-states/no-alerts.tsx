import { Bell } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"

export function NoAlerts() {
  return (
    <EmptyState
      icon={<Bell className="w-16 h-16" />}
      title="No active alerts"
      description="You're all caught up! Alerts will appear here when something needs your attention"
    />
  )
}
