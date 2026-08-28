import Link from "next/link";
import {
  ArrowRight,
  CakeSlice,
  CalendarCheck,
  ShieldCheck,
  Truck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { SmartImage } from "@/components/smart-image";
import { listProducts, listCategories } from "@/lib/catalog";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, categories] = await Promise.all([
    listProducts({ featuredOnly: true, limit: 6 }),
    listCategories(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="container-page grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="text-primary inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
            <Sparkles className="size-4" /> Handmade in Colombo
          </p>
          <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.05] text-balance sm:text-5xl lg:text-6xl">
            Cakes worth <em className="text-primary not-italic">celebrating</em>,
            baked fresh to your order.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-lg text-lg text-balance">
            {site.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/cakes">
                Browse the cake menu <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/how-it-works">How ordering works</Link>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {[
              ["500+", "cakes a year"],
              ["4.9★", "average rating"],
              ["48h", "typical lead time"],
            ].map(([stat, label]) => (
              <div key={label}>
                <dt className="font-display text-2xl font-semibold">{stat}</dt>
                <dd className="text-muted-foreground text-xs">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
            <SmartImage
              priority
              src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80"
              alt="Chocolate celebration cake"
              sizes="(min-width: 1024px) 25vw, 50vw"
            />
          </div>
          <div className="mt-8 grid gap-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl">
              <SmartImage
                src="https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=800&q=80"
                alt="Decorated cupcakes"
                sizes="(min-width: 1024px) 25vw, 50vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl">
              <SmartImage
                src="https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=800&q=80"
                alt="Salted caramel drip cake"
                sizes="(min-width: 1024px) 25vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y bg-card">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-3">
          {[
            [CakeSlice, "Baked to order", "Nothing sits in a display case — every cake is made for your date."],
            [Truck, "Colombo-wide delivery", "Doorstep delivery across the city, or collect from Delgoda."],
            [ShieldCheck, "Secure PayHere checkout", "Pay by card, wallet or online banking. Card details never touch our servers."],
          ].map(([Icon, title, copy]) => (
            <div key={title as string} className="flex gap-3">
              <Icon className="text-primary mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{title as string}</p>
                <p className="text-muted-foreground text-sm">{copy as string}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured cakes */}
      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading
            eyebrow="This month's favourites"
            title="Popular cakes right now"
            description="A snapshot of what our customers are ordering. The full menu has something for every occasion."
          />
          <Button asChild variant="ghost" className="hidden shrink-0 sm:inline-flex">
            <Link href="/cakes">
              View all <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {featured.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 3} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground mt-8 rounded-lg border border-dashed p-8 text-center text-sm">
            The catalogue is empty. Run <code className="text-foreground">npm run db:seed</code> or
            add cakes from the <Link href="/admin" className="underline">staff dashboard</Link>.
          </p>
        )}
      </section>

      {/* Occasions */}
      {categories.length > 0 && (
        <section className="bg-card border-y py-16">
          <div className="container-page">
            <SectionHeading
              eyebrow="Find your occasion"
              title="Cakes for every kind of celebration"
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/cakes?category=${c.slug}`}
                  className="group bg-background hover:border-primary/40 rounded-xl border p-5 transition-colors"
                >
                  <p className="font-display text-lg font-semibold">{c.name}</p>
                  {c.description && (
                    <p className="text-muted-foreground mt-1 text-sm">{c.description}</p>
                  )}
                  <span className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium">
                    Explore <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="container-page py-16" id="how-it-works">
        <SectionHeading
          eyebrow="Simple ordering"
          title="From craving to celebration in three steps"
          align="center"
        />
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            [CakeSlice, "Choose your cake", "Pick from the menu and add a message for the top. Tell us anything special in the notes."],
            [CalendarCheck, "Pick a date & method", "Choose delivery or collection and a date at least 48 hours out."],
            [ShieldCheck, "Pay securely", "Check out with PayHere. You'll get an order reference and we start baking."],
          ].map(([Icon, title, copy], i) => (
            <li key={title as string} className="bg-card rounded-xl border p-6">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                <Icon className="size-5" />
              </div>
              <p className="text-muted-foreground mt-4 text-xs font-semibold">
                STEP {i + 1}
              </p>
              <p className="font-display mt-1 text-lg font-semibold">{title as string}</p>
              <p className="text-muted-foreground mt-1 text-sm">{copy as string}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section className="container-page pb-8">
        <div className="from-primary to-primary/80 text-primary-foreground relative overflow-hidden rounded-2xl bg-gradient-to-br px-8 py-12 text-center">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            Ready to order something delicious?
          </h2>
          <p className="text-primary-foreground/80 mx-auto mt-2 max-w-md">
            Browse the full menu and reserve your date. Custom design enquiries welcome.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link href="/cakes">See the cake menu</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
