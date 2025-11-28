'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { showError } from '@/lib/toast'

interface EditProfileModalProps {
  field: string
  currentValue: string
  onSave: (value: string) => Promise<void>
  onClose: () => void
}

export function EditProfileModal({ field, currentValue, onSave, onClose }: EditProfileModalProps) {
  const [value, setValue] = useState(currentValue)
  const [loading, setLoading] = useState(false)

  const labels: Record<string, string> = {
    username: 'Username',
    business_name: 'Business Name',
    address: 'Address'
  }

  const handleSave = async () => {
    if (!value.trim()) {
      showError('Field cannot be empty')
      return
    }

    setLoading(true)
    try {
      await onSave(value)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/30">
          <h2 className="text-xl font-semibold text-white">
            Edit {labels[field] || field}
          </h2>
          <button
            onClick={onClose}
            className="text-purple-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <label className="block text-purple-300 text-sm mb-2">
            {labels[field] || field}
          </label>
          {field === 'address' ? (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-[#0f0f1e] border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
              placeholder={`Enter ${labels[field]?.toLowerCase()}`}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-4 py-2 bg-[#0f0f1e] border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
              placeholder={`Enter ${labels[field]?.toLowerCase()}`}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-purple-500/30">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-purple-900/30 hover:bg-purple-900/50 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
