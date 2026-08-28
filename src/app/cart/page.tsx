import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartView } from "@/components/cart-view";
import { getCart } from "@/lib/cart";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const cart = await getCart();

  return (
    <div className="container-page py-12">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Your cart</h1>

      {cart.lines.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
          <div className="bg-muted flex size-14 items-center justify-center rounded-full">
            <ShoppingBag className="text-muted-foreground size-6" />
          </div>
          <p className="mt-4 text-lg font-medium">Your cart is empty</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Browse the menu and add a cake to get started.
          </p>
          <Button asChild className="mt-6">
            <Link href="/cakes">See the cake menu</Link>
          </Button>
        </div>
      ) : (
        <CartView cart={cart} />
      )}
    </div>
  );
}
