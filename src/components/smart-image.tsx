"use client";

import * as React from "react";
import Image from "next/image";
import { CakeSlice } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * next/image with a graceful fallback. If the remote image fails to load
 * (or none is set) we show an on-brand gradient placeholder instead of a
 * broken-image icon.
 */
export function SmartImage({
  src,
  alt,
  className,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const showFallback = !src || failed;

  return (
    <div className={cn("bg-muted relative h-full w-full overflow-hidden", className)}>
      {showFallback ? (
        <div className="from-primary/15 via-accent/40 to-secondary flex h-full w-full items-center justify-center bg-gradient-to-br">
          <CakeSlice className="text-primary/40 size-10" aria-hidden />
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
