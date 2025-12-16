import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-purple-500/20 mt-auto bg-[#0f0f23]/50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-purple-300">
          <div className="text-center sm:text-left">
            <p>© {currentYear} The Donna. All rights reserved.</p>
            <p className="text-xs text-purple-400 mt-1">
              Financial management made simple for small businesses
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link 
              href="/privacy" 
              className="hover:text-purple-100 transition-colors hover:underline"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms" 
              className="hover:text-purple-100 transition-colors hover:underline"
            >
              Terms of Service
            </Link>
            <Link 
              href="/settings" 
              className="hover:text-purple-100 transition-colors hover:underline"
            >
              Settings
            </Link>
            <a 
              href="mailto:support@thedonna.app" 
              className="hover:text-purple-100 transition-colors hover:underline"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
