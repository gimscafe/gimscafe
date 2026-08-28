"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

const CART_COOKIE = "sb_cart";

function readCount(): number {
  if (typeof document === "undefined") return 0;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CART_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  if (!raw) return 0;
  try {
    const items = JSON.parse(decodeURIComponent(raw)) as { q?: number }[];
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, i) => sum + (Number(i?.q) || 0), 0);
  } catch {
    return 0;
  }
}

/** Storefront cart counter — reads the cart cookie on the client so the header
 *  (and root layout) can stay static. */
export function CartBadge() {
  const [count, setCount] = React.useState(0);
  const pathname = usePathname();

  React.useEffect(() => {
    const sync = () => setCount(readCount());
    sync();
    window.addEventListener("cart:updated", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("cart:updated", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [pathname]);

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <Link href="/cart">
        <ShoppingBag className="size-5" />
        {count > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}

/** Call after any cart mutation so the badge refreshes immediately. */
export function notifyCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cart:updated"));
  }
}
