import Link from "next/link";

export const metadata = {
  title: "Terms of Service - The Donna",
  description: "Terms and conditions for using The Donna financial management application",
};

export default function TermsPage() {
  const lastUpdated = "December 16, 2025";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] text-white px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header with back link */}
        <div className="mb-8">
          <Link href="/legal" className="text-purple-400 hover:text-purple-300 hover:underline mb-4 inline-block">
            ← Back to Privacy & Legal
          </Link>
          <h1 className="text-4xl font-bold mb-2 mt-4">Terms of Service</h1>
          <p className="text-purple-300">Last Updated: {lastUpdated}</p>
        </div>

        <div className="space-y-8 text-purple-200 prose prose-invert max-w-none">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>By using The Donna, you agree to these Terms of Service. If you don't agree, please don't use the service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Service Description</h2>
            <p className="mb-4">The Donna allows you to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Track financial transactions</li>
              <li>Manage credits and advances</li>
              <li>Generate reports</li>
              <li>Manage parties (customers/vendors)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. User Accounts</h2>
            <p className="mb-4">You must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be at least 18 years old</li>
              <li>Provide accurate information</li>
              <li>Keep your password secure</li>
              <li>Notify us of unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Acceptable Use</h2>
            <p className="mb-4">You may NOT:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use for illegal purposes</li>
              <li>Attempt unauthorized access</li>
              <li>Share your account</li>
              <li>Upload malicious code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Limitation of Liability</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
              <p className="font-semibold mb-2">Important:</p>
              <p>The service is provided "AS IS". We are not liable for indirect damages or business decisions made using the service.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Disclaimer</h2>
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
              <p className="font-semibold mb-2">Not Financial Advice</p>
              <p>The Donna is a tracking tool, NOT professional financial advice. Consult qualified professionals for financial, tax, or legal advice.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Termination</h2>
            <p>You may delete your account anytime. We may terminate accounts for Terms violations.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Contact</h2>
            <p>For questions: <a href="mailto:legal@thedonna.app" className="text-purple-400 hover:underline">legal@thedonna.app</a></p>
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
