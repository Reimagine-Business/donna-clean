import Link from "next/link";

import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";

export function SiteHeader() {
  return (
    <nav className="hidden w-full md:flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-end items-center p-3 px-5 text-sm">
        <div className="flex items-center gap-3">
          <DeployButton />
          {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
        </div>
      </div>
    </nav>
  );
}
