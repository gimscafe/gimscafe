import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Settings2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { KpiTrendChart, type TrendPoint } from "@/components/admin/kpi-trend-chart";
import { Button } from "@/components/ui/button";
import {
  buildKpiReport,
  currentPeriod,
  delta,
  formatMetric,
  formatPeriod,
  getMonthlyTrend,
  isValidPeriod,
  shiftPeriod,
  type Metric,
} from "@/lib/kpi";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "KPI dashboard" };

/** The delta chip: green when the metric moved the way you want it to. */
function DeltaChip({ metric }: { metric: Metric }) {
  const change = delta(metric.value, metric.previous);
  if (change === null || Math.abs(change) < 0.05) return null;

  const good = change > 0 === metric.higherIsBetter;
  const Icon = change > 0 ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        good
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
      )}
      title={`vs ${formatMetric(metric.previous, metric.format)} last month`}
    >
      <Icon className="size-3" aria-hidden />
      {change > 0 ? "+" : ""}
      {change.toFixed(1)}%
    </span>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const unavailable = metric.value === null;

  return (
    <div className="bg-card flex flex-col rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-sm">{metric.label}</p>
        <DeltaChip metric={metric} />
      </div>

      <p
        className={cn(
          "font-display mt-1.5 text-2xl font-semibold tabular-nums",
          unavailable && "text-muted-foreground",
        )}
      >
        {formatMetric(metric.value, metric.format)}
      </p>

      {metric.workings && (
        <p className="text-muted-foreground mt-1 text-xs tabular-nums">
          {metric.workings}
        </p>
      )}

      <p className="text-muted-foreground/80 mt-auto pt-3 font-mono text-[10px] leading-snug">
        {metric.formula}
      </p>

      {metric.note && (
        <p
          className={cn(
            "mt-1.5 text-[11px] leading-snug",
            unavailable ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground",
          )}
        >
          {metric.note}
        </p>
      )}
    </div>
  );
}

export default async function KpiDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: requested } = await searchParams;
  const period = requested ?? currentPeriod();
  if (!isValidPeriod(period)) notFound();

  const [report, trend] = await Promise.all([
    buildKpiReport(period),
    getMonthlyTrend(period, 12),
  ]);

  const trendPoints: TrendPoint[] = trend.map((t) => ({
    ...t,
    label: formatPeriod(t.period),
  }));

  const thisMonth = currentPeriod();
  const isFuture = period >= thisMonth;

  return (
    <div>
      <AdminPageHeader
        title="KPI dashboard"
        description={`${formatPeriod(period)} · compared against ${formatPeriod(
          report.previousPeriod,
        )}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/kpi?period=${shiftPeriod(period, -1)}`}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </Link>
              </Button>
              <Button
                asChild={!isFuture}
                variant="outline"
                size="sm"
                disabled={isFuture}
                aria-label="Next month"
              >
                {isFuture ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <Link href={`/admin/kpi?period=${shiftPeriod(period, 1)}`}>
                    <ChevronRight className="size-4" />
                  </Link>
                )}
              </Button>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/kpi/inputs?period=${period}`}>
                <Settings2 className="size-4" /> Monthly inputs
              </Link>
            </Button>
          </div>
        }
      />

      {/* ------------------------------------------------- data-gap notices */}
      {(report.missingInputs.length > 0 || report.uncostedLines > 0) && (
        <div className="mb-6 space-y-2">
          {report.missingInputs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              <span>
                Missing for {formatPeriod(period)}: {report.missingInputs.join(", ")}.
              </span>
              <Link
                href={`/admin/kpi/inputs?period=${period}`}
                className="inline-flex items-center gap-1 font-medium underline"
              >
                Add them <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
          {report.uncostedLines > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              <span>
                {report.uncostedLines} of {report.facts.totalLines} order lines this
                month have no recorded cost, so profit and ROI are overstated.
              </span>
              <Link
                href="/admin/products/costs"
                className="inline-flex items-center gap-1 font-medium underline"
              >
                Set cake costs <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------ the eleven */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {report.metrics.map((m) => (
          <MetricCard key={m.key} metric={m} />
        ))}
      </div>

      {/* --------------------------------------------------------- trend */}
      <div className="mt-8">
        <KpiTrendChart data={trendPoints} />
      </div>

      {/* ------------------------------------------------ supporting facts */}
      <h2 className="font-display mt-8 mb-3 text-lg font-semibold">
        Underlying figures
      </h2>
      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium">Figure</th>
              <th className="px-4 py-2.5 text-right font-medium">
                {formatPeriod(period)}
              </th>
              <th className="px-4 py-2.5 text-right font-medium">
                {formatPeriod(report.previousPeriod)}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y tabular-nums">
            {[
              ["Confirmed orders", report.facts.orders, report.previousFacts.orders],
              [
                "Online revenue",
                formatMoney(report.facts.revenueCents),
                formatMoney(report.previousFacts.revenueCents),
              ],
              [
                "Cost of goods sold",
                formatMoney(report.facts.cogsCents),
                formatMoney(report.previousFacts.cogsCents),
              ],
              [
                "Gross profit",
                formatMoney(report.facts.revenueCents - report.facts.cogsCents),
                formatMoney(
                  report.previousFacts.revenueCents - report.previousFacts.cogsCents,
                ),
              ],
              [
                "Estimated gateway fees",
                formatMoney(report.gatewayFeesCents),
                "—",
              ],
              ["Customers", report.facts.customers, report.previousFacts.customers],
              [
                "New customers",
                report.facts.newCustomers,
                report.previousFacts.newCustomers,
              ],
              [
                "Returning customers",
                report.facts.repeatCustomers,
                report.previousFacts.repeatCustomers,
              ],
              ["Unique visitors", report.facts.visitors, report.previousFacts.visitors],
              ["Sessions", report.facts.sessions, report.previousFacts.sessions],
              ["Page views", report.facts.pageviews, report.previousFacts.pageviews],
              [
                "Payment attempts",
                report.facts.paymentAttempts,
                report.previousFacts.paymentAttempts,
              ],
            ].map(([label, now, before]) => (
              <tr key={String(label)}>
                <td className="text-muted-foreground px-4 py-2">{label}</td>
                <td className="px-4 py-2 text-right font-medium">{now}</td>
                <td className="text-muted-foreground px-4 py-2 text-right">{before}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
