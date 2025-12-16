import { SiteHeader } from "@/components/site-header";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { BottomNav } from "@/components/navigation/bottom-nav";
import Link from "next/link";
import { Shield, FileText, Lock } from "lucide-react";

export const metadata = {
  title: "Privacy & Legal - The Donna",
  description: "Privacy policy, terms of service, and legal information for The Donna",
};

export default function LegalHubPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white pb-24 md:pb-8">
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <TopNavMobile />

        <section className="flex-1 px-4 py-8 md:px-8 overflow-auto">
          <div className="mx-auto w-full max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-10 h-10 text-purple-400" />
                <h1 className="text-4xl font-bold">Privacy & Legal</h1>
              </div>
              <p className="text-purple-300 text-lg">
                Your data, your rights. Learn about how we protect your information and our legal commitments.
              </p>
            </div>

            {/* Legal Documents Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Privacy Policy */}
              <Link
                href="/privacy"
                className="group p-6 bg-purple-900/20 border border-purple-500/30 rounded-lg hover:bg-purple-900/30 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                    <Lock className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                      Privacy Policy
                    </h2>
                    <p className="text-purple-300 text-sm mb-4">
                      Learn how we collect, use, and protect your personal data. Your privacy is our priority.
                    </p>
                    <div className="text-purple-400 text-sm font-medium">
                      Read Policy →
                    </div>
                  </div>
                </div>
              </Link>

              {/* Terms of Service */}
              <Link
                href="/terms"
                className="group p-6 bg-purple-900/20 border border-purple-500/30 rounded-lg hover:bg-purple-900/30 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                      Terms of Service
                    </h2>
                    <p className="text-purple-300 text-sm mb-4">
                      Understand the terms and conditions for using The Donna financial management platform.
                    </p>
                    <div className="text-purple-400 text-sm font-medium">
                      Read Terms →
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Additional Info */}
            <div className="mt-8 p-6 bg-green-900/10 border border-green-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-green-400 mb-3">
                Your Data Rights
              </h3>
              <ul className="space-y-2 text-purple-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span><strong>Access:</strong> View all your data at any time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span><strong>Export:</strong> Download your data in CSV format</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span><strong>Delete:</strong> Remove your account and all data via Settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span><strong>Portability:</strong> Take your data with you anytime</span>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="mt-8 p-6 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">
                Questions or Concerns?
              </h3>
              <p className="text-purple-300 text-sm mb-4">
                If you have questions about your privacy, data rights, or our legal policies, we're here to help.
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-purple-200">
                  <strong>Email:</strong>{" "}
                  <a href="mailto:support@thedonna.app" className="text-purple-400 hover:underline">
                    support@thedonna.app
                  </a>
                </p>
                <p className="text-purple-200">
                  <strong>Data Protection Officer:</strong>{" "}
                  <a href="mailto:privacy@thedonna.app" className="text-purple-400 hover:underline">
                    privacy@thedonna.app
                  </a>
                </p>
              </div>
            </div>

            {/* Back Link */}
            <div className="mt-8 pt-8 border-t border-purple-500/30">
              <Link 
                href="/home" 
                className="text-purple-400 hover:text-purple-300 hover:underline"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
