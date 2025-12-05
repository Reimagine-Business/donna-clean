"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";
import { DeployButton } from "@/components/deploy-button";

interface HamburgerMenuProps {
  businessName?: string;
  userEmail?: string;
  onClose?: () => void;
}

const menuItems = [
  { href: "/home", label: "Home", icon: "🏠" },
  { href: "/daily-entries", label: "Daily Entries", icon: "📝" },
  { href: "/cashpulse", label: "Cashpulse", icon: "💰" },
  { href: "/profit-lens", label: "Profit Lens", icon: "📊" },
  { href: "/alerts", label: "Alerts", icon: "🔔" },
  { href: "/dashboard", label: "Dashboard", icon: "📈" },
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
        className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg transition-colors hover:bg-slate-800"
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
          "fixed left-0 top-0 z-50 h-full w-80 bg-slate-900 shadow-xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-slate-800 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{businessName}</h2>
                {userEmail && (
                  <p className="mt-1 text-sm text-slate-400">{userEmail}</p>
                )}
              </div>
              <button
                onClick={closeMenu}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-[#a78bfa]/10 text-[#a78bfa]"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <span className="text-lg" aria-hidden="true">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-800 p-4 space-y-3">
            <DeployButton />
            <LogoutButton />
          </div>
        </div>
      </div>
    </>
  );
}
