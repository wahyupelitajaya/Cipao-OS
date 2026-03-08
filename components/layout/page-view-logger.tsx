"use client";

import { useEffect } from "react";
import { logPageView } from "@/app/actions/activity-log";

export function PageViewLogger() {
  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    const userAgent = navigator.userAgent;
    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined;

    logPageView({
      path,
      userAgent,
      timezone,
    }).catch(() => {
      // logging gagal tidak boleh mengganggu user
    });
  }, []);

  return null;
}

