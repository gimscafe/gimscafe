import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/product-card";
import { listProducts, listCategories, getCategoryBySlug } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The cake menu",
  description:
    "Browse celebration cakes, wedding cakes, cupcakes and everyday treats — all baked to order.",
};

export default async function CakesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [categories, products, activeCategory] = await Promise.all([
    listCategories(),
    listProducts({ categorySlug: category }),
    category ? getCategoryBySlug(category) : Promise.resolve(null),
  ]);

  return (
    <div className="container-page py-12">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          {activeCategory ? activeCategory.name : "The cake menu"}
        </h1>
        <p className="text-muted-foreground mt-3">
          {activeCategory?.description ??
            "Every cake is made fresh for your date. Prices are in Sri Lankan Rupees and include a message plaque where relevant."}
        </p>
      </header>

      <nav className="mt-8 flex flex-wrap gap-2">
        <FilterChip href="/cakes" active={!category}>
          All cakes
        </FilterChip>
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            href={`/cakes?category=${c.slug}`}
            active={category === c.slug}
          >
            {c.name}
          </FilterChip>
        ))}
      </nav>

      {products.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 3} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-12 rounded-lg border border-dashed p-10 text-center text-sm">
          No cakes in this category yet. <Link href="/cakes" className="underline">See everything</Link>.
        </p>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-accent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
