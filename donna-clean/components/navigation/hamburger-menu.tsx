"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";
import { User, Settings, Shield } from "lucide-react";

interface HamburgerMenuProps {
  businessName?: string;
  userEmail?: string;
  onClose: () => void;
}

const settingsItems = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/legal", label: "Privacy & Legal", icon: Shield },
];

export function HamburgerMenu({ businessName = "Donna Clean", userEmail, onClose }: HamburgerMenuProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Menu */}
      <div className="fixed left-0 top-0 z-50 h-full w-80 bg-card shadow-xl transition-transform duration-300 translate-x-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-purple-500/30 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{businessName}</h2>
                {userEmail && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-purple-300">Signed in as</p>
                    <p className="text-sm text-white font-medium truncate">{userEmail}</p>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-white"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Settings Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div>
              <h3 className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-purple-400">
                Settings
              </h3>
              <ul className="space-y-2">
                {settingsItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-purple-500/20 text-purple-200"
                            : "text-purple-200/70 hover:bg-purple-900/30 hover:text-purple-200"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Footer with Logout */}
          <div className="border-t border-purple-500/30 p-4">
            <LogoutButton />
          </div>
        </div>
      </div>
    </>
  );
}
