import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/app/admin/actions";
import { site } from "@/lib/site";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="container-page py-8">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="mb-4">
            <p className="font-display text-lg font-semibold">{site.name}</p>
            <p className="text-muted-foreground text-xs">Staff dashboard</p>
          </div>
          <AdminNav />
          <div className="text-muted-foreground mt-6 space-y-2 border-t pt-4 text-sm">
            <Link
              href="/"
              className="hover:text-foreground flex items-center gap-2"
              target="_blank"
            >
              <ExternalLink className="size-4" /> View storefront
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="hover:text-foreground flex items-center gap-2"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
            <p className="pt-2 text-xs break-all">{session.email}</p>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
