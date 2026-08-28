import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getAdminSession } from "@/lib/auth";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="bg-card w-full max-w-sm rounded-2xl border p-8">
        <p className="font-display text-xl font-semibold">{site.name}</p>
        <p className="text-muted-foreground text-sm">Staff dashboard</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
