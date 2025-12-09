import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {/* Icon */}
      <div className="mb-4 text-gray-400">
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-400 mb-6 max-w-md">
        {description}
      </p>

      {/* Optional Action Button */}
      {action && (
        <Button
          onClick={action.onClick}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
