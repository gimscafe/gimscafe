import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronLeft, Utensils } from "lucide-react";
import { SmartImage } from "@/components/smart-image";
import { ProductCard } from "@/components/product-card";
import { AddToCartForm } from "@/components/add-to-cart-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/money";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { commerce } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return {
    title: product.name,
    description: product.shortDescription ?? undefined,
    openGraph: {
      title: product.name,
      description: product.shortDescription ?? undefined,
      images: product.imageUrl ? [product.imageUrl] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product, 3);
  const gallery = [product.imageUrl, ...(product.gallery ?? [])].filter(
    Boolean,
  ) as string[];

  return (
    <div className="container-page py-10">
      <Link
        href="/cakes"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" /> Back to menu
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl border">
            <SmartImage
              src={gallery[0] ?? null}
              alt={product.name}
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {gallery.slice(1, 5).map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-lg border"
                >
                  <SmartImage src={src} alt={`${product.name} ${i + 2}`} sizes="20vw" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.isFeatured && <Badge>Popular</Badge>}
            {!product.isAvailable && (
              <Badge variant="secondary">Currently unavailable</Badge>
            )}
          </div>
          <h1 className="font-display mt-2 text-3xl font-semibold sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-2xl font-semibold">
            {formatMoney(product.priceCents)}
          </p>

          <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {product.servesText && (
              <span className="inline-flex items-center gap-1.5">
                <Utensils className="size-4" /> {product.servesText}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4" />
              {product.leadTimeDays} day{product.leadTimeDays === 1 ? "" : "s"} notice
            </span>
          </div>

          {product.description && (
            <p className="text-muted-foreground mt-5 whitespace-pre-line leading-relaxed">
              {product.description}
            </p>
          )}

          {product.flavourNotes && (
            <p className="mt-4 text-sm">
              <span className="font-semibold">Flavours:</span>{" "}
              <span className="text-muted-foreground">{product.flavourNotes}</span>
            </p>
          )}

          <Separator className="my-6" />

          <AddToCartForm productId={product.id} disabled={!product.isAvailable} />

          <div className="bg-muted/50 text-muted-foreground mt-6 rounded-lg p-4 text-xs leading-relaxed">
            Delivery across Colombo is {formatMoney(commerce.deliveryFeeCents)}
            {commerce.freeDeliveryOverCents > 0 && (
              <> (free over {formatMoney(commerce.freeDeliveryOverCents)})</>
            )}
            . Collection is free from {commerce.pickupLocation}. Choose your date and
            method at checkout.
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl font-semibold">You might also like</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
