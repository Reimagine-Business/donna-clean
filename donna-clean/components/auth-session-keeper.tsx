"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function AuthSessionKeeper() {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let intervalId: number | null = null;

    const refreshSession = async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
          console.error("[Auth] Interval Refresh failed", error);
          return;
        }

        if (data.session) {
          console.info("[Auth] Interval Refresh OK");
        } else {
          console.warn("[Auth] Interval Refresh missing session");
        }
      } catch (refreshError) {
        console.error("[Auth] Interval Refresh failed", refreshError);
      }
    };

    const initialize = () => {
      void refreshSession();
      intervalId = window.setInterval(refreshSession, FIVE_MINUTES_MS);
    };

    initialize();

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [supabase]);

  return null;
}
