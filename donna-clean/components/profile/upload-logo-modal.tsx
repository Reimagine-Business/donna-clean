'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Upload } from 'lucide-react'

interface UploadLogoModalProps {
  currentLogoUrl: string | null
  userId: string
  onSuccess: () => void
  onClose: () => void
}

export function UploadLogoModal({ currentLogoUrl, userId, onSuccess, onClose }: UploadLogoModalProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('❌ Please select an image file (PNG, JPG, etc.)')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ File size must be less than 5MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setUploading(true)
    setMessage('Uploading...')

    try {
      const fileExt = file.name.split('.').pop()
      // Use user ID folder structure with consistent filename
      const fileName = `${userId}/logo.${fileExt}`

      console.log('📤 Uploading logo:', fileName)

      // Upload to 'logos' bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Overwrite if exists
        })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw uploadError
      }

      console.log('✅ Upload successful:', uploadData)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      console.log('🔗 Public URL:', publicUrl)

      // Update profiles table with logo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          logo_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('❌ Profile update error:', updateError)
        console.error('Error details:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details
        })
        throw updateError
      }

      console.log('✅ Profile updated with logo URL')

      setMessage('✅ Logo uploaded successfully!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error('❌ Logo upload failed:', error)
      const errorMessage = error.message || 'Unknown error'
      setMessage(`❌ Upload failed: ${errorMessage}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-purple-500/30">
          <h2 className="text-xl font-semibold text-white">
            Upload Logo
          </h2>
          <button
            onClick={onClose}
            className="text-purple-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-6">
            {preview ? (
              <img
                src={preview}
                alt="Logo preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-purple-500"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-purple-900/30 border-4 border-purple-500/50 flex items-center justify-center">
                <Upload className="w-12 h-12 text-purple-400" />
              </div>
            )}
          </div>

          <label className="block">
            <div className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center cursor-pointer transition-colors">
              {uploading ? 'Uploading...' : 'Choose Logo'}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>

          <p className="text-purple-400 text-xs text-center mt-2">
            PNG, JPG up to 5MB
          </p>

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes('✅')
                ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                : 'bg-red-900/20 border border-red-500/30 text-red-400'
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-purple-500/30">
          <button
            onClick={onClose}
            disabled={uploading}
            className="flex-1 px-6 py-3 bg-purple-900/30 hover:bg-purple-900/50 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
