import Link from "next/link";
import { Camera, ThumbsUp, Mail, Phone, MapPin } from "lucide-react";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card mt-24">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-semibold">{site.fullName}</p>
          <p className="text-muted-foreground mt-2 max-w-xs text-sm">
            {site.description}
          </p>
          <div className="mt-4 flex gap-3">
            <Link href={site.instagram} aria-label="Instagram" className="text-muted-foreground hover:text-foreground">
              <Camera className="size-5" />
            </Link>
            <Link href={site.facebook} aria-label="Facebook" className="text-muted-foreground hover:text-foreground">
              <ThumbsUp className="size-5" />
            </Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">Explore</p>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            <li><Link href="/cakes" className="hover:text-foreground">All cakes</Link></li>
            <li><Link href="/how-it-works" className="hover:text-foreground">How ordering works</Link></li>
            <li><Link href="/about" className="hover:text-foreground">Our story</Link></li>
            <li><Link href="/contact" className="hover:text-foreground">Contact &amp; FAQs</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Get in touch</p>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2"><Phone className="size-4" /> {site.phone}</li>
            <li className="flex items-center gap-2"><Mail className="size-4" /> {site.email}</li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0" /> {site.address}</li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Opening hours</p>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            <li>Tue – Fri · 9am – 6pm</li>
            <li>Saturday · 9am – 4pm</li>
            <li>Sun – Mon · Collections only</li>
          </ul>
          <p className="text-muted-foreground/70 mt-4 text-xs">
            Payments secured by PayHere. We never store your card details.
          </p>
        </div>
      </div>

      <div className="border-t">
        <div className="container-page text-muted-foreground flex flex-col gap-2 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.fullName}. All rights reserved.</p>
          <p>
            <Link href="/admin" className="hover:text-foreground">Staff sign in</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
