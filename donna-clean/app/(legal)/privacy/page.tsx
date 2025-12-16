import { SiteHeader } from "@/components/site-header";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { BottomNav } from "@/components/navigation/bottom-nav";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - The Donna",
  description: "Privacy policy for The Donna financial management application",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "December 16, 2025";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <TopNavMobile />

        <section className="flex-1 px-4 py-8 md:px-8 overflow-auto">
          <div className="mx-auto w-full max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
              <p className="text-purple-300">Last Updated: {lastUpdated}</p>
            </div>

            <div className="space-y-8 text-purple-200">
              {/* Introduction */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
                <p className="mb-4">
                  Welcome to The Donna ("<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>"). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our financial management application.
                </p>
                <p>
                  By using The Donna, you agree to the collection and use of information in accordance with this policy.
                </p>
              </section>

              {/* Information We Collect */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
                
                <h3 className="text-xl font-semibold text-purple-100 mb-3">Personal Information</h3>
                <p className="mb-4">When you create an account, we collect:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Email address</li>
                  <li>Password (encrypted)</li>
                  <li>User ID (automatically generated)</li>
                </ul>

                <h3 className="text-xl font-semibold text-purple-100 mb-3">Financial Data</h3>
                <p className="mb-4">When you use our service, you provide:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Transaction entries (Cash IN, Cash OUT, Credit, Advance)</li>
                  <li>Entry amounts and categories</li>
                  <li>Settlement information</li>
                  <li>Party information (customer and vendor names)</li>
                  <li>Notes and descriptions you add to entries</li>
                </ul>

                <h3 className="text-xl font-semibold text-purple-100 mb-3">Automatically Collected Information</h3>
                <p className="mb-4">We automatically collect:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Log data (IP address, browser type, pages visited)</li>
                  <li>Device information</li>
                  <li>Usage patterns and analytics</li>
                  <li>Error reports and crash data (via Sentry)</li>
                </ul>

                <h3 className="text-xl font-semibold text-purple-100 mb-3">Cookies</h3>
                <p className="mb-4">We use essential cookies to:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Keep you logged in</li>
                  <li>Remember your preferences</li>
                  <li>Ensure security of your session</li>
                </ul>
                <p>
                  We do NOT use tracking cookies or sell your data to third parties.
                </p>
              </section>

              {/* How We Use Your Information */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
                <p className="mb-4">We use your information to:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Provide and maintain our service</li>
                  <li>Process and display your financial data</li>
                  <li>Generate analytics and reports for you</li>
                  <li>Send you important updates and notifications</li>
                  <li>Improve our service and fix bugs</li>
                  <li>Ensure security and prevent fraud</li>
                  <li>Comply with legal obligations</li>
                </ul>
                <p className="text-yellow-400 font-semibold">
                  We NEVER sell your data to third parties or use it for advertising.
                </p>
              </section>

              {/* Data Storage and Security */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Data Storage and Security</h2>
                <p className="mb-4">
                  Your data is stored securely using industry-standard practices:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li><strong>Encryption:</strong> All data is encrypted in transit (HTTPS) and at rest</li>
                  <li><strong>Database:</strong> Hosted on Supabase (PostgreSQL) with row-level security</li>
                  <li><strong>Authentication:</strong> Secure password hashing and session management</li>
                  <li><strong>Access Control:</strong> You can only access your own data</li>
                  <li><strong>Monitoring:</strong> Error tracking via Sentry (anonymized)</li>
                </ul>
                <p>
                  While we implement strong security measures, no system is 100% secure. We recommend using a strong, unique password.
                </p>
              </section>

              {/* Third-Party Services */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Third-Party Services</h2>
                <p className="mb-4">We use the following third-party services:</p>
                
                <div className="space-y-4">
                  <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                    <h4 className="font-semibold text-purple-100 mb-2">Supabase (Database & Authentication)</h4>
                    <p className="text-sm">Purpose: Store your data and manage authentication</p>
                    <p className="text-sm">Privacy Policy: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">supabase.com/privacy</a></p>
                  </div>

                  <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                    <h4 className="font-semibold text-purple-100 mb-2">Vercel (Hosting)</h4>
                    <p className="text-sm">Purpose: Host and deliver the application</p>
                    <p className="text-sm">Privacy Policy: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">vercel.com/legal/privacy-policy</a></p>
                  </div>

                  <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                    <h4 className="font-semibold text-purple-100 mb-2">Sentry (Error Tracking)</h4>
                    <p className="text-sm">Purpose: Monitor errors and improve reliability</p>
                    <p className="text-sm">Privacy Policy: <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">sentry.io/privacy</a></p>
                  </div>
                </div>
              </section>

              {/* Your Rights */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
                <p className="mb-4">You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li><strong>Access:</strong> View all your data at any time</li>
                  <li><strong>Export:</strong> Download your data in CSV format</li>
                  <li><strong>Rectification:</strong> Edit or correct your data</li>
                  <li><strong>Deletion:</strong> Delete your account and all data via <Link href="/settings" className="text-purple-400 hover:underline">Settings</Link></li>
                  <li><strong>Portability:</strong> Take your data with you</li>
                  <li><strong>Object:</strong> Opt out of non-essential data processing</li>
                </ul>
                <p className="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30">
                  <strong>To exercise your rights:</strong> Go to <Link href="/settings" className="text-purple-400 hover:underline">Settings</Link> or contact us at support@thedonna.app
                </p>
              </section>

              {/* Data Retention */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Data Retention</h2>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li><strong>Active Accounts:</strong> Data retained as long as your account is active</li>
                  <li><strong>Deleted Accounts:</strong> Data permanently deleted within 30 days</li>
                  <li><strong>Legal Requirements:</strong> Some data may be retained longer if required by law</li>
                  <li><strong>Backups:</strong> Backup data deleted within 90 days of account deletion</li>
                </ul>
              </section>

              {/* Children's Privacy */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Children's Privacy</h2>
                <p>
                  The Donna is not intended for users under 18 years of age. We do not knowingly collect data from children. If you believe a child has provided us with personal information, please contact us immediately.
                </p>
              </section>

              {/* International Data Transfers */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">International Data Transfers</h2>
                <p className="mb-4">
                  Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this privacy policy and applicable laws.
                </p>
              </section>

              {/* Changes to This Policy */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Changes to This Policy</h2>
                <p className="mb-4">
                  We may update this privacy policy from time to time. We will notify you of significant changes by:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Posting the new policy on this page</li>
                  <li>Updating the "Last Updated" date</li>
                  <li>Sending you an email notification (for material changes)</li>
                </ul>
              </section>

              {/* Contact Us */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
                <p className="mb-4">
                  If you have questions about this privacy policy or your data, contact us at:
                </p>
                <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                  <p><strong>Email:</strong> support@thedonna.app</p>
                  <p><strong>Data Protection Officer:</strong> privacy@thedonna.app</p>
                </div>
              </section>

              {/* Compliance */}
              <section className="bg-green-900/10 p-6 rounded-lg border border-green-500/30">
                <h2 className="text-2xl font-semibold text-green-400 mb-4">Legal Compliance</h2>
                <p className="mb-2">This privacy policy complies with:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>India's Information Technology Act, 2000</li>
                  <li>EU General Data Protection Regulation (GDPR)</li>
                  <li>California Consumer Privacy Act (CCPA)</li>
                  <li>Industry best practices for data protection</li>
                </ul>
              </section>
            </div>

            {/* Back to Home */}
            <div className="mt-8 pt-8 border-t border-purple-500/30">
              <Link 
                href="/" 
                className="text-purple-400 hover:text-purple-300 hover:underline"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
