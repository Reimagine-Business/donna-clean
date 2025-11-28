'use client'

import { useState } from "react"
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  showDetails?: boolean
  details?: string
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  showDetails = false,
  details
}: ErrorStateProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-8 max-w-md w-full">
        {/* Icon and Title */}
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-red-400 mb-2">
              {title}
            </h3>
            <p className="text-sm text-red-300">
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-6">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Try Again
            </Button>
          )}

          {showDetails && details && (
            <Button
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-900/30"
            >
              {detailsExpanded ? (
                <>
                  Hide Details <ChevronUp className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Show Details <ChevronDown className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* Collapsible Details */}
        {showDetails && details && detailsExpanded && (
          <div className="mt-4 p-4 bg-red-950/50 border border-red-500/30 rounded text-xs text-red-300 font-mono overflow-auto max-h-48">
            {details}
          </div>
        )}
      </div>
    </div>
  )
}
