import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - The Donna",
  description: "Privacy policy for The Donna financial management application",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "December 16, 2025";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header with back link */}
        <div className="mb-8">
          <Link href="/legal" className="text-purple-400 hover:text-purple-300 hover:underline mb-4 inline-block">
            ← Back to Privacy & Legal
          </Link>
          <h1 className="text-4xl font-bold mb-2 mt-4">Privacy Policy</h1>
          <p className="text-purple-300">Last Updated: {lastUpdated}</p>
        </div>

        <div className="space-y-8 text-purple-200 prose prose-invert max-w-none">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
            <p className="mb-4">
              Welcome to The Donna. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our financial management application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
            <p className="mb-4">When you use The Donna, we collect:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Account information (email, password)</li>
              <li>Financial transaction data</li>
              <li>Usage analytics</li>
              <li>Device and browser information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Provide and maintain our service</li>
              <li>Process your financial data</li>
              <li>Send important updates</li>
              <li>Improve our service</li>
              <li>Ensure security</li>
            </ul>
            <p className="text-yellow-400 font-semibold">
              We NEVER sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Data Security</h2>
            <p className="mb-4">Your data is secured using:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption in transit and at rest</li>
              <li>Secure authentication</li>
              <li>Row-level database security</li>
              <li>Regular security audits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your data anytime</li>
              <li>Export your data</li>
              <li>Delete your account</li>
              <li>Update your information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
            <p>For privacy questions: <a href="mailto:privacy@thedonna.app" className="text-purple-400 hover:underline">privacy@thedonna.app</a></p>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-8 pt-8 border-t border-purple-500/30">
          <Link href="/legal" className="text-purple-400 hover:text-purple-300 hover:underline">
            ← Back to Privacy & Legal
          </Link>
        </div>
      </div>
    </main>
  );
}
