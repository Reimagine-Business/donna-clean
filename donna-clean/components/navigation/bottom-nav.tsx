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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white h-24 md:hidden">
      <div className="h-full flex items-center justify-evenly px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className="flex flex-col items-center gap-1 transition-all"
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-lg border-2 transition-colors",
                  isActive
                    ? "border-purple-600 bg-purple-600"
                    : "border-gray-300 bg-white"
                )}
              >
                <Icon
                  size={24}
                  strokeWidth={2}
                  className={cn(
                    "transition-colors",
                    isActive ? "text-white" : "text-gray-600"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] md:text-[11px] font-medium transition-colors",
                  isActive ? "text-purple-600" : "text-gray-600"
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
