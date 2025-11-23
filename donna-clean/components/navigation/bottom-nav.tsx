"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home" },
  { href: "/daily-entries", label: "Entries" },
  { href: "/cashpulse", label: "Cashpulse" },
  { href: "/profit-lens", label: "Profit Lens" },
  { href: "/alerts", label: "Alerts" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900 md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[48px] flex-1 items-center justify-center py-3 transition-colors",
                isActive
                  ? "text-[#a78bfa]"
                  : "text-slate-400 hover:text-slate-300"
              )}
            >
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
