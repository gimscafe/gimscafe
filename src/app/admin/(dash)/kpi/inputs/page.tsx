import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { KpiInputsForm } from "@/components/admin/kpi-inputs-form";
import { Button } from "@/components/ui/button";
import {
  currentPeriod,
  formatPeriod,
  getKpiInputs,
  isValidPeriod,
  recentPeriods,
} from "@/lib/kpi";

export const metadata = { title: "Monthly KPI inputs" };

export default async function KpiInputsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: requested } = await searchParams;
  const period = requested ?? currentPeriod();
  if (!isValidPeriod(period)) notFound();

  const inputs = await getKpiInputs(period);
  const periodLabel = formatPeriod(period);
  const options = recentPeriods(currentPeriod(), 12).reverse();

  return (
    <div>
      <AdminPageHeader
        title="Monthly KPI inputs"
        description="Figures the storefront cannot know. Saved per month, so history stays intact."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/kpi?period=${period}`}>
              <ArrowLeft className="size-4" /> Back to KPIs
            </Link>
          </Button>
        }
      />

      <nav className="mb-6 flex flex-wrap gap-1.5" aria-label="Choose a month">
        {options.map((p) => (
          <Link
            key={p}
            href={`/admin/kpi/inputs?period=${p}`}
            aria-current={p === period ? "page" : undefined}
            className={
              p === period
                ? "bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground rounded-md border px-2.5 py-1 text-xs font-medium"
            }
          >
            {formatPeriod(p)}
          </Link>
        ))}
      </nav>

      <KpiInputsForm
        key={period}
        period={period}
        periodLabel={periodLabel}
        inputs={inputs}
      />
    </div>
  );
}
