'use client'

export const dynamic = 'force-dynamic'

import { BottomNav } from '@/components/navigation/bottom-nav'
import { TopNavMobile } from '@/components/navigation/top-nav-mobile'
import { FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const supabase = createClient()

  // Fetch user for top nav
  useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) return null
      return user
    },
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="min-h-screen bg-[#0f0f1e] pb-24 md:pb-8">
      <TopNavMobile />

      <div className="container mx-auto px-4 pt-2 pb-24 md:p-6 max-w-3xl">
        {/* Page Header */}
        <div className="mt-2 mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Coming Soon Notice */}
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">
              More Settings Coming Soon
            </h2>
            <p className="text-purple-300">
              Additional preferences and options will be available in the next update.
            </p>
          </div>

          {/* Legal Links */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Legal & Privacy
            </h2>

            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
              <div className="space-y-3">
                <a
                  href="/privacy-policy"
                  className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Privacy Policy
                </a>
                <a
                  href="/terms"
                  className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Terms of Service
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
