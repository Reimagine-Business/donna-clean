"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", icon: "🏠", label: "Home" },
  { href: "/daily-entries", icon: "📝", label: "Entries" },
  { href: "/cashpulse", icon: "💰", label: "Cashpulse" },
  { href: "/profit-lens", icon: "📊", label: "Profit Lens" },
  { href: "/alerts", icon: "🔔", label: "Alerts" },
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
                "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
                isActive
                  ? "text-[#a78bfa]"
                  : "text-slate-400 hover:text-slate-300"
              )}
            >
              <span className="text-xl" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
