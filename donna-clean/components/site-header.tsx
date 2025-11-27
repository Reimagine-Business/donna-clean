'use client'

import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { DesktopNav } from "@/components/navigation/desktop-nav";
import { DesktopUserMenu } from "@/components/navigation/desktop-user-menu";
import { hasEnvVars } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function SiteHeader() {
  const supabase = createClient();

  // Fetch user with React Query
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) return null;
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <nav className="hidden w-full md:flex justify-center border-b border-b-foreground/10 h-16 bg-card">
      <div className="w-full max-w-6xl flex justify-between items-center p-3 px-5 text-sm">
        {/* Desktop Navigation Links */}
        <DesktopNav />

        {/* Auth & Utility Buttons */}
        <div className="flex items-center gap-3">
          <DeployButton />
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : user ? (
            <DesktopUserMenu userEmail={user.email || undefined} />
          ) : (
            <div className="flex gap-2">
              <a
                href="/auth/login"
                className="px-4 py-2 text-sm font-medium text-purple-200 hover:text-white transition-colors"
              >
                Sign in
              </a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
