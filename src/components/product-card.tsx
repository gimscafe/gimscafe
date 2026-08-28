import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SmartImage } from "@/components/smart-image";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/db/schema";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Pick<
    Product,
    "name" | "slug" | "priceCents" | "imageUrl" | "shortDescription" | "isAvailable" | "servesText"
  >;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/cakes/${product.slug}`}
      className="group border-border/70 bg-card focus-visible:ring-ring flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <SmartImage
          src={product.imageUrl}
          alt={product.name}
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {!product.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <Badge variant="secondary" className="text-xs">Currently unavailable</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-semibold leading-snug">
            {product.name}
          </h3>
          <ArrowUpRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
        {product.servesText && (
          <p className="text-muted-foreground text-xs">{product.servesText}</p>
        )}
        {product.shortDescription && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {product.shortDescription}
          </p>
        )}
        <p className="text-foreground mt-auto pt-3 text-sm font-semibold">
          {formatMoney(product.priceCents)}
        </p>
      </div>
    </Link>
  );
}
