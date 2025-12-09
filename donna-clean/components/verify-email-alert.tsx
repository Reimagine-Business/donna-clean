"use client";

import { useEffect } from "react";
import { showInfo } from "@/lib/toast";

type VerifyEmailAlertProps = {
  shouldAlert: boolean;
};

export function VerifyEmailAlert({ shouldAlert }: VerifyEmailAlertProps) {
  useEffect(() => {
    if (!shouldAlert) {
      return;
    }

    if (typeof window !== "undefined") {
      showInfo("Verify email");
    }
  }, [shouldAlert]);

  return null;
}
