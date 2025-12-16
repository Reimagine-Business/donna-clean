import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building, Settings as SettingsIcon, AlertTriangle } from "lucide-react";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { SiteHeader } from "@/components/site-header";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { BottomNav } from "@/components/navigation/bottom-nav";

export const metadata = {
  title: "Settings | The Donna",
  description: "Manage your account settings and preferences",
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { user } = await getOrRefreshUser(supabase);

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
      <SiteHeader />
      <TopNavMobile />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8 bg-purple-900/20 p-1 rounded-lg">
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger
              value="business"
              className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger
              value="danger"
              className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Danger Zone</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <section className="p-6 border border-purple-500/30 rounded-lg bg-purple-900/10">
              <h2 className="text-xl font-semibold mb-6 text-purple-200">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={user.id}
                    disabled
                    className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/30 rounded-md text-purple-300 text-sm font-mono"
                  />
                  <p className="text-xs text-purple-400/70 mt-1">
                    Your unique user identifier
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/30 rounded-md text-white"
                  />
                  <p className="text-xs text-purple-400/70 mt-1">
                    Email cannot be changed
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Account Created
                  </label>
                  <input
                    type="text"
                    value={new Date(user.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    disabled
                    className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/30 rounded-md text-purple-300"
                  />
                </div>
              </div>
            </section>

            <div className="p-4 bg-purple-900/20 border border-purple-500/20 rounded-lg">
              <p className="text-sm text-purple-300">
                💡 <strong>Tip:</strong> More profile customization options coming soon, including profile pictures and display names.
              </p>
            </div>
          </TabsContent>

          {/* Business Tab */}
          <TabsContent value="business" className="space-y-6">
            <section className="p-6 border border-purple-500/30 rounded-lg bg-purple-900/10">
              <h2 className="text-xl font-semibold mb-6 text-purple-200">Business Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your business name"
                    className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-md text-white placeholder:text-purple-400/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Business Type
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-md text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    disabled
                  >
                    <option>Select business type...</option>
                    <option>Service Business</option>
                    <option>Retail</option>
                    <option>Wholesale</option>
                    <option>Manufacturing</option>
                    <option>Freelance</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Technology, Retail, Healthcare"
                    className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-md text-white placeholder:text-purple-400/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    disabled
                  />
                </div>
              </div>
            </section>

            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300">
                ⚠️ <strong>Coming Soon:</strong> Business profile settings are currently in development. You'll be able to customize your business information in the next update.
              </p>
            </div>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <section className="p-6 border border-purple-500/30 rounded-lg bg-purple-900/10">
              <h2 className="text-xl font-semibold mb-6 text-purple-200">App Preferences</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Currency
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-md text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    disabled
                  >
                    <option value="INR">₹ Indian Rupee (INR)</option>
                    <option value="USD">$ US Dollar (USD)</option>
                    <option value="EUR">€ Euro (EUR)</option>
                    <option value="GBP">£ British Pound (GBP)</option>
                  </select>
                  <p className="text-xs text-purple-400/70 mt-1">
                    Default: Indian Rupee (₹)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Date Format
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-md text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    disabled
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                  </select>
                  <p className="text-xs text-purple-400/70 mt-1">
                    Default: DD/MM/YYYY
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Number Format
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-md text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    disabled
                  >
                    <option value="IN">Indian (1,00,000)</option>
                    <option value="US">International (100,000)</option>
                  </select>
                  <p className="text-xs text-purple-400/70 mt-1">
                    Default: Indian numbering system
                  </p>
                </div>
              </div>
            </section>

            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300">
                ⚠️ <strong>Coming Soon:</strong> Preference settings are currently in development. These options will be functional in the next update.
              </p>
            </div>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger" className="space-y-6">
            <DeleteAccountSection />
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </main>
  );
}
