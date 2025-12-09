'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Entries error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">😔</div>
        <h2 className="text-2xl font-bold mb-2 text-white">Entries Error</h2>
        <p className="text-gray-400 mb-6">
          Something went wrong loading your entries. We've been notified and are working on it.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-white transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/home'}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
