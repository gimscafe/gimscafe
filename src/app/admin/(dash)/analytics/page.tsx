import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/charts/stat-tile";
import { TrendAreaChart } from "@/components/admin/charts/trend-area-chart";
import { FunnelChart } from "@/components/admin/charts/funnel-chart";
import { BarList } from "@/components/admin/charts/bar-list";
import { ShareBar } from "@/components/admin/charts/share-bar";
import { StackedColumns } from "@/components/admin/charts/stacked-columns";
import { OrderHeatmap } from "@/components/admin/charts/order-heatmap";
import { ScheduleColumns } from "@/components/admin/charts/schedule-columns";
import {
  RANGES,
  getCategoryMix,
  getCustomerCohorts,
  getDailySeries,
  getFulfilmentMix,
  getFunnel,
  getOrderHeatmap,
  getStatusBreakdown,
  getTopCities,
  getTopPages,
  getTopProducts,
  getTotals,
  getTrafficSources,
  getUpcomingSchedule,
  isRangeKey,
  resolveRange,
  type RangeKey,
} from "@/lib/analytics";
import { ORDER_STATUS_META } from "@/lib/order-status";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Analytics" };

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Headline figures read in whole rupees; cents on an average are noise. */
function wholeRupees(cents: number): string {
  return formatMoney(Math.round(cents / 100) * 100);
}

function shortDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: requested } = await searchParams;
  const key: RangeKey = isRangeKey(requested) ? requested : "30d";
  const range = resolveRange(key);

  const [
    totals,
    prevTotals,
    daily,
    funnel,
    products,
    categories,
    cohorts,
    heatmap,
    fulfilment,
    statuses,
    cities,
    sources,
    pages,
    schedule,
  ] = await Promise.all([
    getTotals(range.start, range.end),
    getTotals(range.prevStart, range.start),
    getDailySeries(range.start, range.end),
    getFunnel(range.start, range.end),
    getTopProducts(range.start, range.end),
    getCategoryMix(range.start, range.end),
    getCustomerCohorts(6),
    getOrderHeatmap(range.start, range.end),
    getFulfilmentMix(range.start, range.end),
    getStatusBreakdown(range.start, range.end),
    getTopCities(range.start, range.end),
    getTrafficSources(range.start, range.end),
    getTopPages(range.start, range.end),
    getUpcomingSchedule(14),
  ]);

  const aov = totals.orders === 0 ? 0 : totals.revenueCents / totals.orders;
  const prevAov =
    prevTotals.orders === 0 ? 0 : prevTotals.revenueCents / prevTotals.orders;
  const grossProfit = totals.revenueCents - totals.cogsCents;
  const prevGrossProfit = prevTotals.revenueCents - prevTotals.cogsCents;

  const trend = daily.map((d) => ({ ...d, label: shortDate(d.day) }));
  const categoryTotal = categories.reduce((s, c) => s + c.value, 0);
  const uncosted = products.some((p) => !p.costed);

  const tiles = [
    {
      label: "Revenue",
      value: wholeRupees(totals.revenueCents),
      previous: wholeRupees(prevTotals.revenueCents),
      change: pctChange(totals.revenueCents, prevTotals.revenueCents),
      spark: daily.map((d) => d.revenueCents),
    },
    {
      label: "Orders",
      value: totals.orders.toLocaleString("en-LK"),
      previous: prevTotals.orders.toLocaleString("en-LK"),
      change: pctChange(totals.orders, prevTotals.orders),
      spark: daily.map((d) => d.orders),
    },
    {
      label: "Average order value",
      value: wholeRupees(aov),
      previous: wholeRupees(prevAov),
      change: pctChange(aov, prevAov),
      spark: daily.map((d) => (d.orders === 0 ? 0 : d.revenueCents / d.orders)),
    },
    {
      label: "Gross profit",
      value: wholeRupees(grossProfit),
      previous: wholeRupees(prevGrossProfit),
      change: pctChange(grossProfit, prevGrossProfit),
      spark: daily.map((d) => Math.max(d.revenueCents - d.cogsCents, 0)),
    },
    {
      label: "Unique visitors",
      value: totals.visitors.toLocaleString("en-LK"),
      previous: prevTotals.visitors.toLocaleString("en-LK"),
      change: pctChange(totals.visitors, prevTotals.visitors),
      spark: daily.map((d) => d.visitors),
    },
    {
      label: "Page views",
      value: totals.pageviews.toLocaleString("en-LK"),
      previous: prevTotals.pageviews.toLocaleString("en-LK"),
      change: pctChange(totals.pageviews, prevTotals.pageviews),
      spark: daily.map((d) => d.pageviews),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        description="How the shop is trading — sales, cakes, customers, traffic and the week ahead."
        action={
          <Link
            href="/admin/kpi"
            className="text-primary inline-flex items-center gap-1 text-sm font-medium"
          >
            KPI dashboard <ArrowRight className="size-3.5" />
          </Link>
        }
      />

      {/* Filters: one row, above everything they scope. */}
      <nav
        className="mb-6 flex flex-wrap items-center gap-1.5"
        aria-label="Date range"
      >
        {(Object.keys(RANGES) as RangeKey[]).map((k) => (
          <Link
            key={k}
            href={`/admin/analytics?range=${k}`}
            aria-current={k === key ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              k === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground border",
            )}
          >
            {RANGES[k].label}
          </Link>
        ))}
        <span className="text-muted-foreground ml-1 text-xs">
          vs the previous {range.days} days
        </span>
      </nav>

      {uncosted && (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Some cakes sold in this range have no recorded cost, so gross profit is
          overstated.{" "}
          <Link href="/admin/products/costs" className="font-medium underline">
            Set cake costs
          </Link>
          .
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <StatTile key={t.label} {...t} />
        ))}
      </div>

      <div className="mt-4 grid gap-4">
        <TrendAreaChart data={trend} />

        <div className="grid gap-4 lg:grid-cols-2">
          <FunnelChart steps={funnel} />
          <OrderHeatmap cells={heatmap} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <BarList
            title="Best-selling cakes"
            subtitle="By revenue"
            data={products.map((p) => ({
              label: p.name,
              value: p.revenueCents,
              display: formatMoney(p.revenueCents),
              detail: `${p.units} sold · ${
                p.costed ? `${formatMoney(p.profitCents)} profit` : "cost not set"
              }`,
            }))}
            empty="No cakes sold in this range yet."
            table={{
              columns: ["Cake", "Revenue", "Units", "Profit"],
              rows: products.map((p) => [
                p.name,
                formatMoney(p.revenueCents),
                p.units,
                p.costed ? formatMoney(p.profitCents) : "—",
              ]),
            }}
          />

          <ShareBar
            title="Revenue by category"
            subtitle={
              categoryTotal > 0
                ? `${formatMoney(categoryTotal)} of cake sales`
                : undefined
            }
            data={categories.map((c) => ({
              label: c.label,
              value: c.value,
              display: formatMoney(c.value),
            }))}
            empty="No sales to split by category yet."
            table={{
              columns: ["Category", "Revenue", "Share"],
              rows: categories.map((c) => [
                c.label,
                formatMoney(c.value),
                `${((c.value / Math.max(categoryTotal, 1)) * 100).toFixed(1)}%`,
              ]),
            }}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <StackedColumns data={cohorts} />

          <ShareBar
            title="Delivery vs collection"
            subtitle={`${totals.orders} order${totals.orders === 1 ? "" : "s"}`}
            data={fulfilment.map((f) => ({
              label: f.label,
              value: f.value,
              display: `${f.value} order${f.value === 1 ? "" : "s"}`,
            }))}
            empty="No confirmed orders in this range yet."
            table={{
              columns: ["Type", "Orders"],
              rows: fulfilment.map((f) => [f.label, f.value]),
            }}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <BarList
            title="Where visitors come from"
            subtitle="Unique visitors by referrer"
            data={sources.map((s) => ({
              label: s.label,
              value: s.value,
              display: s.value.toLocaleString("en-LK"),
            }))}
            empty="No tracked visits in this range yet."
            table={{
              columns: ["Source", "Visitors"],
              rows: sources.map((s) => [s.label, s.value]),
            }}
          />

          <BarList
            title="Most viewed pages"
            subtitle="Page views"
            data={pages.map((p) => ({
              label: p.label,
              value: p.value,
              display: p.value.toLocaleString("en-LK"),
            }))}
            empty="No tracked page views in this range yet."
            table={{
              columns: ["Page", "Views"],
              rows: pages.map((p) => [p.label, p.value]),
            }}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <BarList
            title="Order status"
            subtitle="Every order placed in this range"
            data={statuses.map((s) => ({
              label: ORDER_STATUS_META[s.label as keyof typeof ORDER_STATUS_META]
                ?.label ?? s.label,
              value: s.value,
              display: `${s.value}`,
              detail: formatMoney(s.secondaryCents ?? 0),
            }))}
            empty="No orders in this range yet."
            table={{
              columns: ["Status", "Orders", "Value"],
              rows: statuses.map((s) => [
                ORDER_STATUS_META[s.label as keyof typeof ORDER_STATUS_META]?.label ??
                  s.label,
                s.value,
                formatMoney(s.secondaryCents ?? 0),
              ]),
            }}
          />

          <BarList
            title="Top delivery areas"
            subtitle="Delivered orders by city"
            data={cities.map((c) => ({
              label: c.label,
              value: c.value,
              display: `${c.value} order${c.value === 1 ? "" : "s"}`,
              detail: formatMoney(c.secondaryCents ?? 0),
            }))}
            empty="No delivery orders in this range yet."
            table={{
              columns: ["City", "Orders", "Value"],
              rows: cities.map((c) => [
                c.label,
                c.value,
                formatMoney(c.secondaryCents ?? 0),
              ]),
            }}
          />
        </div>

        <ScheduleColumns data={schedule} />
      </div>
    </div>
  );
}
