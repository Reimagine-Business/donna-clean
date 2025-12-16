"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookie-consent", "declined");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#1a1a2e] border-t border-purple-500/30 shadow-lg animate-in slide-in-from-bottom">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Content */}
          <div className="flex-1 text-sm text-purple-200">
            <p className="font-semibold text-white mb-1">🍪 Cookie Notice</p>
            <p>
              We use essential cookies to keep you logged in and ensure the security of your session. 
              We do NOT use tracking cookies or share your data with third parties.{" "}
              <Link 
                href="/privacy" 
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Learn more
              </Link>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={declineCookies}
              className="px-4 py-2 text-sm bg-purple-900/30 hover:bg-purple-900/50 text-purple-200 rounded-md border border-purple-500/30 transition-colors whitespace-nowrap"
            >
              Decline
            </button>
            <button
              onClick={acceptCookies}
              className="px-6 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors whitespace-nowrap"
            >
              Accept
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="p-2 text-purple-400 hover:text-purple-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
