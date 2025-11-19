"use client";

import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const supabase = useMemo(() => createClient(), []);
  const [isPending, setIsPending] = useState(false);

  const handleLogout = useCallback(async () => {
    if (isPending) {
      return;
    }

    setIsPending(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[Auth] Logout failed", error);
    } finally {
      if (typeof window !== "undefined") {
        try {
          window.localStorage?.clear();
        } catch {
          // ignore storage clearing errors
        }
        window.location.href = "/auth/login";
      }
      setIsPending(false);
    }
  }, [isPending, supabase]);

  return (
    <Button onClick={handleLogout} disabled={isPending}>
      {isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}
