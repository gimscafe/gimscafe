"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "sb_vid";
const SESSION_KEY = "sb_sid";

/**
 * First-party page-view beacon. `visitorId` persists in localStorage (unique
 * visitors), `sessionId` lives in sessionStorage (one browsing session), and
 * the pair feeds the Conversion Rate KPI.
 *
 * Runs only in the browser, so crawlers that don't execute JS are excluded —
 * which is what you want for a conversion denominator. Storage access is
 * wrapped because private-mode browsers can throw on read or write.
 */
function readOrCreate(store: Storage | undefined, key: string): string | null {
  if (!store) return null;
  try {
    const existing = store.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    store.setItem(key, id);
    return id;
  } catch {
    return null;
  }
}

export function VisitTracker() {
  const pathname = usePathname();
  // Guards against React 18/19 double-effects and repeated renders of the
  // same path sending duplicate views.
  const lastSent = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Staff browsing the dashboard are not storefront traffic.
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    const visitorId = readOrCreate(window.localStorage, VISITOR_KEY);
    const sessionId = readOrCreate(window.sessionStorage, SESSION_KEY);
    if (!visitorId || !sessionId) return;

    const body = JSON.stringify({
      visitorId,
      sessionId,
      path: pathname,
      referrer: document.referrer || "",
    });

    // keepalive so the view still lands if the visitor navigates away at once.
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must never break the page.
    });
  }, [pathname]);

  return null;
}
