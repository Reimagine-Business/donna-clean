"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";
import { User, Settings, Users } from "lucide-react";

interface HamburgerMenuProps {
  businessName?: string;
  userEmail?: string;
}

const settingsItems = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin/users", label: "User Management", icon: Users, adminOnly: true },
];

export function HamburgerMenu({ businessName = "Donna Clean", userEmail }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg transition-colors hover:bg-secondary"
        aria-label="Menu"
      >
        <span
          className={cn(
            "h-0.5 w-5 bg-white transition-all",
            isOpen && "translate-y-2 rotate-45"
          )}
        />
        <span
          className={cn(
            "h-0.5 w-5 bg-white transition-all",
            isOpen && "opacity-0"
          )}
        />
        <span
          className={cn(
            "h-0.5 w-5 bg-white transition-all",
            isOpen && "-translate-y-2 -rotate-45"
          )}
        />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Menu */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-80 bg-card shadow-xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
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
                onClick={closeMenu}
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
                        onClick={closeMenu}
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
