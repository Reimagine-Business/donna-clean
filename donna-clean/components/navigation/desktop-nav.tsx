"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home" },
  { href: "/daily-entries", label: "Entries" },
  { href: "/analytics/cashpulse", label: "Cashpulse" },
  { href: "/analytics/profitlens", label: "Profit Lens" },
  { href: "/alerts", label: "Alerts" },
];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-6">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
