import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-primary text-6xl font-semibold">404</p>
      <h1 className="font-display mt-3 text-2xl font-semibold">
        We couldn&apos;t find that page
      </h1>
      <p className="text-muted-foreground mt-2 max-w-sm">
        The link may be broken or the cake may have sold out. Try the menu instead.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/cakes">Browse cakes</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
