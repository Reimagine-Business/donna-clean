"use client";

import { useEffect } from "react";
import { showWarning } from "@/lib/toast";

type SessionExpiredNoticeProps = {
  message?: string;
};

export function SessionExpiredNotice({
  message = "Session expired – relogin",
}: SessionExpiredNoticeProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      showWarning(message);
    }
  }, [message]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card/40 p-8 text-center text-white shadow-2xl shadow-black/40">
      <div>
        <p className="text-xl font-semibold">{message}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Please sign in again from the login page to continue tracking your finances.
        </p>
      </div>
      <a
        href="/auth/login"
        className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/20"
      >
        Go to login
      </a>
    </div>
  );
}
