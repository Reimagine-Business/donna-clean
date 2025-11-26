"use client";

import { HamburgerMenu } from "@/components/navigation/hamburger-menu";

interface TopNavMobileProps {
  pageTitle: string;
  userEmail?: string;
}

export function TopNavMobile({ pageTitle, userEmail }: TopNavMobileProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-card md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg md:text-xl font-bold text-white">{pageTitle}</h1>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            {userEmail && (
              <span className="text-xs text-muted-foreground">{userEmail}</span>
            )}
            <span className="text-[9px] md:text-[10px] text-muted-foreground">
              Powered by The Donna
            </span>
          </div>
          <HamburgerMenu businessName="Donna Clean" userEmail={userEmail} />
        </div>
      </div>
    </header>
  );
}
