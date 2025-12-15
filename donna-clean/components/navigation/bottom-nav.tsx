"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Edit3, TrendingUp, Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/entries", label: "Entries", icon: Edit3 },
  { href: "/analytics/cashpulse", label: "Cashpulse", icon: TrendingUp },
  { href: "/analytics/profitlens", label: "Profit Lens", icon: Search },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-card h-24 md:hidden">
      <div className="h-full flex items-center justify-evenly px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 transition-all"
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-lg border-2 transition-colors",
                  isActive
                    ? "border-[#673AB7] bg-[#673AB7]"
                    : "border-[#673AB7] bg-[#1a1a2e]"
                )}
              >
                <Icon
                  size={24}
                  strokeWidth={2}
                  className={cn(
                    "transition-colors",
                    isActive ? "text-white" : "text-[#B39DDB]"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] md:text-[11px] font-medium transition-colors",
                  isActive ? "text-white" : "text-[#B39DDB]"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
