import Link from "next/link";

import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";

export function SiteHeader() {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex items-center gap-6 font-semibold">
          <Link href="/">Donna Clean</Link>
          <div className="flex items-center gap-4 text-sm font-normal">
            <Link className="hover:underline" href="/dashboard">
              Dashboard
            </Link>
            <Link className="hover:underline" href="/daily-entries">
              Daily entries
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DeployButton />
          {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
        </div>
      </div>
    </nav>
  );
}
