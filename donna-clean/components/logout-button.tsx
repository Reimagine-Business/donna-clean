"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    if (isPending) return;

    setIsPending(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[Auth] Logout failed", error);
    }

    // Clear any leftover localStorage if you want (optional)
    if (typeof window !== "undefined") {
      try {
        window.localStorage.clear();
      } catch {}
    }

    // Redirect to login (or refresh current page)
    router.push("/auth/login");
    router.refresh();   // forces Next.js to re-check auth state immediately
  };

  return (
    <Button onClick={handleLogout} disabled={isPending}>
      {isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}
