import { FileX } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"

interface NoEntriesProps {
  onAddEntry?: () => void
}

export function NoEntries({ onAddEntry }: NoEntriesProps) {
  return (
    <EmptyState
      icon={<FileX className="w-16 h-16" />}
      title="No entries yet"
      description="Start tracking your business by adding your first entry"
      action={onAddEntry ? {
        label: "Add Entry",
        onClick: onAddEntry
      } : undefined}
    />
  )
}
