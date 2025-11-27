'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { TopNavMobile } from '@/components/navigation/top-nav-mobile'
import { User, Building2, MapPin, Mail, ImageIcon, Lock } from 'lucide-react'
import { EditProfileModal } from '@/components/profile/edit-profile-modal'
import { ChangePasswordModal } from '@/components/profile/change-password-modal'
import { UploadLogoModal } from '@/components/profile/upload-logo-modal'

interface Profile {
  username: string
  business_name: string
  address: string
  logo_url: string | null
  created_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingField, setEditingField] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (field: string, value: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', user.id)

      if (error) throw error

      await loadProfile()
      setEditingField(null)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0f1e]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f1e] pb-24 md:pb-8">
      <SiteHeader />
      <TopNavMobile />

      <div className="container mx-auto px-4 pt-2 pb-24 md:p-6 max-w-3xl">
        {/* Page Header */}
        <div className="mt-2 mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Profile</h1>
        </div>

        {/* Header with Logo */}
        <div className="bg-gradient-to-r from-purple-900/40 to-purple-800/40 rounded-lg p-8 mb-6 text-center border border-purple-500/30">
          <div className="flex flex-col items-center gap-4">
            {/* Logo/Avatar */}
            <div className="relative">
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt="Business Logo"
                  className="w-24 h-24 rounded-full object-cover border-4 border-purple-500"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-purple-700 flex items-center justify-center border-4 border-purple-500">
                  <Building2 className="w-12 h-12 text-white" />
                </div>
              )}
            </div>

            {/* Business Name & Username */}
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {profile?.business_name || 'My Business'}
              </h1>
              <p className="text-purple-300">
                {profile?.username || user?.email?.split('@')[0]}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Fields */}
        <div className="space-y-4">
          {/* Username */}
          <ProfileField
            icon={<User className="w-5 h-5" />}
            label="Username"
            value={profile?.username || ''}
            onEdit={() => setEditingField('username')}
          />

          {/* Business Name */}
          <ProfileField
            icon={<Building2 className="w-5 h-5" />}
            label="Business Name"
            value={profile?.business_name || ''}
            onEdit={() => setEditingField('business_name')}
          />

          {/* Address */}
          <ProfileField
            icon={<MapPin className="w-5 h-5" />}
            label="Address"
            value={profile?.address || ''}
            onEdit={() => setEditingField('address')}
          />

          {/* Admin Email */}
          <ProfileField
            icon={<Mail className="w-5 h-5" />}
            label="Admin Email"
            value={user?.email || ''}
            onEdit={null}
            readOnly
            helper="Contact admin to change email"
          />

          {/* Logo */}
          <ProfileField
            icon={<ImageIcon className="w-5 h-5" />}
            label="Logo"
            value={profile?.logo_url ? 'Logo uploaded' : 'No logo'}
            onEdit={() => setEditingField('logo')}
          />

          {/* Password */}
          <ProfileField
            icon={<Lock className="w-5 h-5" />}
            label="Password"
            value="••••••••"
            onEdit={() => setEditingField('password')}
            buttonText="Change"
          />

          {/* Account Info */}
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
            <p className="text-purple-300 text-sm">
              Member since {new Date(profile?.created_at || '').toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Edit Modals */}
      {editingField && editingField !== 'password' && editingField !== 'logo' && (
        <EditProfileModal
          field={editingField}
          currentValue={profile?.[editingField as keyof Profile] as string || ''}
          onSave={(value) => handleUpdate(editingField, value)}
          onClose={() => setEditingField(null)}
        />
      )}

      {editingField === 'password' && (
        <ChangePasswordModal
          onClose={() => setEditingField(null)}
        />
      )}

      {editingField === 'logo' && user && (
        <UploadLogoModal
          currentLogoUrl={profile?.logo_url || null}
          userId={user.id}
          onSuccess={loadProfile}
          onClose={() => setEditingField(null)}
        />
      )}
    </div>
  )
}

// ProfileField Component
function ProfileField({
  icon,
  label,
  value,
  onEdit,
  readOnly = false,
  helper,
  buttonText = 'Edit'
}: {
  icon: React.ReactNode
  label: string
  value: string
  onEdit: (() => void) | null
  readOnly?: boolean
  helper?: string
  buttonText?: string
}) {
  return (
    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="text-purple-400">{icon}</div>
          <span className="text-purple-300 text-sm font-medium">{label}</span>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
          >
            {buttonText}
          </button>
        )}
      </div>
      <p className="text-white text-lg ml-8">
        {value || 'Not set'}
      </p>
      {helper && (
        <p className="text-purple-400 text-xs ml-8 mt-1">{helper}</p>
      )}
    </div>
  )
}
