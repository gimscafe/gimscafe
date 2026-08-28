import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteNav } from "@/components/site-nav";
import { CartBadge } from "@/components/cart-badge";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold tracking-tight">
            {site.name}
          </span>
          <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.2em]">
            {site.tagline}
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <SiteNav />
          <CartBadge />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
