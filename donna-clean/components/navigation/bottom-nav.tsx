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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-card md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[40px] flex-1 items-center justify-center py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
