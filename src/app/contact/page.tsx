import type { Metadata } from "next";
import { Mail, Phone, MapPin, MessageCircle, Clock } from "lucide-react";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${site.fullName}.`,
};

export default function ContactPage() {
  const waNumber = site.whatsapp.replace(/[^\d]/g, "");
  return (
    <div className="container-page max-w-3xl py-14">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Contact us</h1>
      <p className="text-muted-foreground mt-3">
        For custom design enquiries, large orders or anything the menu doesn&apos;t
        cover, get in touch — we usually reply within a day.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href={`https://wa.me/${waNumber}`}
          className="bg-card hover:border-primary/40 flex items-start gap-3 rounded-xl border p-5 transition-colors"
        >
          <MessageCircle className="text-primary mt-0.5 size-5" />
          <span>
            <span className="block font-medium">WhatsApp</span>
            <span className="text-muted-foreground text-sm">{site.phone}</span>
          </span>
        </a>
        <a
          href={`tel:${site.phone.replace(/\s/g, "")}`}
          className="bg-card hover:border-primary/40 flex items-start gap-3 rounded-xl border p-5 transition-colors"
        >
          <Phone className="text-primary mt-0.5 size-5" />
          <span>
            <span className="block font-medium">Call</span>
            <span className="text-muted-foreground text-sm">{site.phone}</span>
          </span>
        </a>
        <a
          href={`mailto:${site.email}`}
          className="bg-card hover:border-primary/40 flex items-start gap-3 rounded-xl border p-5 transition-colors"
        >
          <Mail className="text-primary mt-0.5 size-5" />
          <span>
            <span className="block font-medium">Email</span>
            <span className="text-muted-foreground text-sm">{site.email}</span>
          </span>
        </a>
        <div className="bg-card flex items-start gap-3 rounded-xl border p-5">
          <MapPin className="text-primary mt-0.5 size-5" />
          <span>
            <span className="block font-medium">Studio &amp; collection</span>
            <span className="text-muted-foreground text-sm">{site.address}</span>
          </span>
        </div>
      </div>

      <div className="bg-card mt-4 flex items-start gap-3 rounded-xl border p-5">
        <Clock className="text-primary mt-0.5 size-5" />
        <div className="text-sm">
          <p className="font-medium">Opening hours</p>
          <ul className="text-muted-foreground mt-1 space-y-0.5">
            <li>Tuesday – Friday · 9am – 6pm</li>
            <li>Saturday · 9am – 4pm</li>
            <li>Sunday &amp; Monday · Collections by arrangement</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
