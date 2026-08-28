import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/section-heading";
import { commerce } from "@/lib/site";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "How ordering works",
  description:
    "How to order a cake from Gim's Cafe — lead times, delivery, collection and payment.",
};

const STEPS = [
  {
    title: "1. Browse and add to cart",
    body: "Pick your cakes from the menu. Add a short message for the top of the cake, and set the quantity. You can order more than one item.",
  },
  {
    title: "2. Choose delivery or collection",
    body: `At checkout, choose doorstep delivery across Colombo (${formatMoney(
      commerce.deliveryFeeCents,
    )}${
      commerce.freeDeliveryOverCents > 0
        ? `, free over ${formatMoney(commerce.freeDeliveryOverCents)}`
        : ""
    }) or free collection from our kitchen at ${commerce.pickupLocation}.`,
  },
  {
    title: "3. Pick a date",
    body: `Most cakes need ${commerce.defaultLeadTimeDays} days' notice; tiered and highly custom cakes need longer. The checkout calendar only lets you choose dates we can actually make.`,
  },
  {
    title: "4. Pay securely with PayHere",
    body: "Pay by Visa, Mastercard, Amex, eZ Cash, mCash or online banking through PayHere. We never see or store your card details. You get an order reference straight away.",
  },
  {
    title: "5. We bake and hand over",
    body: "You'll get updates as your order moves through the kitchen. On the day, we deliver to your door or have it boxed and ready for collection.",
  },
];

const FAQS = [
  {
    q: "Can I customise a cake beyond what's on the menu?",
    a: "Yes. Order the closest cake on the menu and describe what you'd like in the notes box at checkout — colours, themes, tiers, dietary needs. We'll email you if the design changes the price.",
  },
  {
    q: "Do you cater for allergies?",
    a: "Our kitchen handles nuts, gluten, dairy and eggs. We can accommodate some requirements with notice, but we can't guarantee a completely allergen-free environment. Tell us in the notes.",
  },
  {
    q: "What if I need to change or cancel?",
    a: "Contact us as early as possible. Changes are usually fine up to 48 hours before your date. Cancellations inside 48 hours may not be refundable as ingredients are already bought.",
  },
  {
    q: "Which areas do you deliver to?",
    a: "Colombo 1–15 and nearby suburbs. For other areas, get in touch before ordering and we'll quote a delivery fee.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container-page max-w-3xl py-14">
      <SectionHeading
        eyebrow="Ordering"
        title="How ordering works"
        description="Everything from lead times to payment, in one place."
      />

      <ol className="mt-10 space-y-6">
        {STEPS.map((s) => (
          <li key={s.title} className="bg-card rounded-xl border p-6">
            <h3 className="font-display text-lg font-semibold">{s.title}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{s.body}</p>
          </li>
        ))}
      </ol>

      <h2 className="font-display mt-16 text-2xl font-semibold">Frequently asked</h2>
      <dl className="mt-6 space-y-5">
        {FAQS.map((f) => (
          <div key={f.q} className="border-b pb-5">
            <dt className="font-medium">{f.q}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{f.a}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 text-center">
        <Button asChild size="lg">
          <Link href="/cakes">Start your order</Link>
        </Button>
      </div>
    </div>
  );
}
