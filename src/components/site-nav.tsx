"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { site } from "@/lib/site";

const LINKS = [
  { href: "/cakes", label: "Cakes" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "Our story" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(pathname, l.href) ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <Button asChild size="sm" className="hidden sm:inline-flex">
        <Link href="/cakes">Order a cake</Link>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
            />
          }
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-6">
          <SheetHeader className="p-0">
            <SheetTitle className="font-display text-xl">{site.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "hover:bg-accent rounded-md px-3 py-2.5 text-sm font-medium",
                  isActive(pathname, l.href) && "bg-accent",
                )}
              >
                {l.label}
              </Link>
            ))}
            <Button asChild className="mt-3">
              <Link href="/cakes" onClick={() => setOpen(false)}>
                Order a cake
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
