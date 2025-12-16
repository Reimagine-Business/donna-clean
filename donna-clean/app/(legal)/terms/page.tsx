import { SiteHeader } from "@/components/site-header";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { BottomNav } from "@/components/navigation/bottom-nav";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service - The Donna",
  description: "Terms of service for The Donna financial management application",
};

export default function TermsOfServicePage() {
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
              <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
              <p className="text-purple-300">Last Updated: {lastUpdated}</p>
            </div>

            <div className="space-y-8 text-purple-200">
              {/* Introduction */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Agreement to Terms</h2>
                <p className="mb-4">
                  Welcome to The Donna! These Terms of Service ("<strong>Terms</strong>") govern your use of our financial management application ("<strong>Service</strong>"). By accessing or using The Donna, you agree to be bound by these Terms.
                </p>
                <p className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/30 text-yellow-200">
                  <strong>Important:</strong> If you do not agree with these Terms, please do not use our Service.
                </p>
              </section>

              {/* Service Description */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Service Description</h2>
                <p className="mb-4">
                  The Donna provides a cloud-based financial management tool designed for service-based small businesses in India. Our Service allows you to:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Record financial transactions (Cash IN, Cash OUT, Credit, Advance)</li>
                  <li>Track settlements and payments</li>
                  <li>Manage parties (customers and vendors)</li>
                  <li>Generate financial reports and analytics</li>
                  <li>Export data for accounting purposes</li>
                </ul>
                <p className="text-purple-300">
                  The Service is provided "as is" and we reserve the right to modify or discontinue features at any time.
                </p>
              </section>

              {/* Eligibility */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Eligibility</h2>
                <p className="mb-4">You must meet the following requirements to use our Service:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Be at least 18 years of age</li>
                  <li>Have the legal capacity to enter into binding contracts</li>
                  <li>Provide accurate and complete registration information</li>
                  <li>Comply with all applicable laws in your jurisdiction</li>
                </ul>
              </section>

              {/* Account Registration */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Account Registration and Security</h2>
                
                <h3 className="text-xl font-semibold text-purple-100 mb-3">Registration</h3>
                <p className="mb-4">To use our Service, you must:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Create an account with a valid email address</li>
                  <li>Choose a secure password</li>
                  <li>Provide truthful and accurate information</li>
                  <li>Keep your account information up-to-date</li>
                </ul>

                <h3 className="text-xl font-semibold text-purple-100 mb-3">Account Security</h3>
                <p className="mb-4">You are responsible for:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Maintaining the confidentiality of your password</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized access</li>
                </ul>
                <p className="text-red-300">
                  <strong>Important:</strong> Never share your password with anyone. We will never ask for your password.
                </p>
              </section>

              {/* Acceptable Use */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Acceptable Use Policy</h2>
                <p className="mb-4">You agree NOT to:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Use the Service for any illegal purpose</li>
                  <li>Violate any laws in your jurisdiction</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Upload malicious code, viruses, or harmful content</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the Service</li>
                  <li>Use the Service to harass, abuse, or harm others</li>
                  <li>Scrape, copy, or reverse engineer the Service</li>
                  <li>Resell or redistribute the Service</li>
                  <li>Create multiple accounts to evade restrictions</li>
                </ul>
                <p className="bg-red-900/20 p-4 rounded-lg border border-red-500/30 text-red-200">
                  <strong>Violation of these terms may result in immediate account termination.</strong>
                </p>
              </section>

              {/* User Content */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">User Content and Data</h2>
                
                <h3 className="text-xl font-semibold text-purple-100 mb-3">Your Data</h3>
                <p className="mb-4">
                  You retain all ownership rights to the data you input into the Service. This includes your financial entries, party information, and notes.
                </p>

                <h3 className="text-xl font-semibold text-purple-100 mb-3">License to Us</h3>
                <p className="mb-4">
                  By using the Service, you grant us a limited license to store, process, and display your data solely for the purpose of providing the Service to you.
                </p>

                <h3 className="text-xl font-semibold text-purple-100 mb-3">Data Accuracy</h3>
                <p className="mb-4">You are responsible for:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>The accuracy of data you enter</li>
                  <li>Regularly backing up your critical data</li>
                  <li>Verifying reports before making business decisions</li>
                </ul>
              </section>

              {/* Intellectual Property */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Intellectual Property</h2>
                <p className="mb-4">
                  The Donna and all its content, features, and functionality are owned by us and protected by international copyright, trademark, and other intellectual property laws.
                </p>
                <p className="mb-4">This includes:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Source code and software</li>
                  <li>User interface and design</li>
                  <li>Logos, branding, and trademarks</li>
                  <li>Documentation and content</li>
                </ul>
                <p>
                  You may not copy, modify, distribute, sell, or lease any part of our Service without explicit written permission.
                </p>
              </section>

              {/* Fees and Payment */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Fees and Payment</h2>
                <p className="mb-4 bg-green-900/10 p-4 rounded-lg border border-green-500/30 text-green-200">
                  <strong>Currently Free:</strong> The Donna is currently offered free of charge during our beta period.
                </p>
                <p className="mb-4">
                  We reserve the right to introduce paid features or subscription plans in the future. You will be notified in advance of any pricing changes.
                </p>
              </section>

              {/* Disclaimers */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Disclaimers</h2>
                
                <h3 className="text-xl font-semibold text-purple-100 mb-3">No Warranty</h3>
                <p className="mb-4">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                </p>

                <h3 className="text-xl font-semibold text-purple-100 mb-3">Not Financial Advice</h3>
                <p className="mb-4 bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/30 text-yellow-200">
                  <strong>Important:</strong> The Donna is a tool for recording and organizing financial data. It does NOT provide financial, tax, or legal advice. Consult qualified professionals for business decisions.
                </p>

                <h3 className="text-xl font-semibold text-purple-100 mb-3">Data Accuracy</h3>
                <p className="mb-4">
                  While we strive for accuracy, we do not guarantee that the Service will be error-free or that calculations will always be correct. Always verify important figures.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
                <p className="mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Any indirect, incidental, or consequential damages</li>
                  <li>Loss of profits, revenue, or data</li>
                  <li>Business interruption or loss of goodwill</li>
                  <li>Errors, mistakes, or inaccuracies in the Service</li>
                  <li>Unauthorized access to your data due to security breaches</li>
                </ul>
                <p>
                  Our total liability shall not exceed the amount you paid us in the last 12 months (currently $0).
                </p>
              </section>

              {/* Indemnification */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Indemnification</h2>
                <p>
                  You agree to indemnify and hold harmless The Donna, its officers, directors, employees, and agents from any claims, damages, or expenses arising from:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Your use of the Service</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any rights of another party</li>
                  <li>Your data or content</li>
                </ul>
              </section>

              {/* Termination */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Termination</h2>
                
                <h3 className="text-xl font-semibold text-purple-100 mb-3">By You</h3>
                <p className="mb-4">
                  You may terminate your account at any time by using the "Delete My Account" feature in <Link href="/settings" className="text-purple-400 hover:underline">Settings</Link>.
                </p>

                <h3 className="text-xl font-semibold text-purple-100 mb-3">By Us</h3>
                <p className="mb-4">
                  We may terminate or suspend your account immediately if you:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Violate these Terms</li>
                  <li>Engage in fraudulent or illegal activities</li>
                  <li>Abuse or harm other users</li>
                  <li>Fail to respond to our communications</li>
                </ul>

                <h3 className="text-xl font-semibold text-purple-100 mb-3">Effect of Termination</h3>
                <p>
                  Upon termination, your right to use the Service will cease immediately. Your data may be deleted within 30 days unless legally required to retain it.
                </p>
              </section>

              {/* Modifications */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Modifications to Service and Terms</h2>
                <p className="mb-4">
                  We reserve the right to modify or discontinue the Service (or any part of it) at any time with or without notice.
                </p>
                <p className="mb-4">
                  We may update these Terms from time to time. We will notify you of material changes by:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Updating the "Last Updated" date</li>
                  <li>Sending an email notification</li>
                  <li>Displaying a prominent notice in the Service</li>
                </ul>
                <p>
                  Continued use of the Service after changes constitutes acceptance of the new Terms.
                </p>
              </section>

              {/* Governing Law */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Governing Law and Dispute Resolution</h2>
                <p className="mb-4">
                  These Terms shall be governed by the laws of India, without regard to conflict of law provisions.
                </p>
                <p className="mb-4">
                  Any disputes arising from these Terms or the Service shall be resolved through:
                </p>
                <ol className="list-decimal pl-6 space-y-2 mb-4">
                  <li>Good faith negotiations between the parties</li>
                  <li>Mediation (if negotiations fail)</li>
                  <li>Arbitration in accordance with Indian arbitration laws</li>
                  <li>Courts of [Your Jurisdiction], India (as a last resort)</li>
                </ol>
              </section>

              {/* Severability */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Severability</h2>
                <p>
                  If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect.
                </p>
              </section>

              {/* Entire Agreement */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Entire Agreement</h2>
                <p>
                  These Terms, together with our <Link href="/privacy" className="text-purple-400 hover:underline">Privacy Policy</Link>, constitute the entire agreement between you and The Donna regarding the use of our Service.
                </p>
              </section>

              {/* Contact Us */}
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Contact Information</h2>
                <p className="mb-4">
                  If you have questions about these Terms, please contact us:
                </p>
                <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                  <p><strong>Email:</strong> legal@thedonna.app</p>
                  <p><strong>Support:</strong> support@thedonna.app</p>
                </div>
              </section>

              {/* Acknowledgment */}
              <section className="bg-purple-900/30 p-6 rounded-lg border border-purple-500/30">
                <h2 className="text-2xl font-semibold text-white mb-4">Acknowledgment</h2>
                <p>
                  BY USING THE DONNA, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
                </p>
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
