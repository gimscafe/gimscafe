import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/smart-image";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Our story",
  description: `About ${site.fullName} — a small-batch cake studio in Colombo.`,
};

export default function AboutPage() {
  return (
    <div className="container-page max-w-4xl py-14">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-primary text-xs font-semibold uppercase tracking-[0.18em]">
            Our story
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">
            A small kitchen with a serious sweet tooth
          </h1>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            {site.name} started at a home oven in Colombo 7, baking birthday cakes for
            friends. Word spread, the orders grew, and today we&apos;re a dedicated
            studio turning out celebration cakes, wedding tiers and dessert tables for
            hundreds of families a year.
          </p>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            We still do things the slow way: real butter, fresh eggs, local fruit in
            season, and every cake made to order — never from a display case. If it
            isn&apos;t good enough for our own table, it doesn&apos;t leave the kitchen.
          </p>
          <Button asChild className="mt-6">
            <Link href="/cakes">See what we&apos;re baking</Link>
          </Button>
        </div>

        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border">
          <SmartImage
            src="https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=900&q=80"
            alt="Decorating a cake in the studio"
            sizes="(min-width: 768px) 40vw, 100vw"
            priority
          />
        </div>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        {[
          ["Baked to order", "Nothing is pre-made. Your cake is baked for your date."],
          ["Local ingredients", "Seasonal fruit and quality dairy from suppliers we know."],
          ["Made by hand", "Every swirl, drip and sugar flower is done by a person, not a machine."],
        ].map(([t, d]) => (
          <div key={t} className="bg-card rounded-xl border p-5">
            <p className="font-display text-lg font-semibold">{t}</p>
            <p className="text-muted-foreground mt-1 text-sm">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
