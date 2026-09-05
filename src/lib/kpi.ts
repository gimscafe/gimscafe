import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { kpiInputs, orders } from "@/db/schema";
import type { KpiInputs } from "@/db/schema";

/**
 * KPI engine for the admin dashboard.
 *
 * Every figure is derived from one calendar month ("period", `YYYY-MM`) and
 * compared against the month before it. A metric whose inputs are missing
 * reports `value: null` with a `missing` note rather than a misleading zero —
 * a conversion rate of 0% and "we have no visitor data yet" are very
 * different statements.
 *
 * Money is in cents everywhere, matching the rest of the app.
 */

/** Statuses that count as real, recognised revenue. */
const CONFIRMED = sql`${orders.status} not in ('pending_payment', 'cancelled')`;

/** Bakery-local reporting timezone; month boundaries are cut here, not in UTC. */
const REPORT_TZ = process.env.REPORT_TIMEZONE || "Asia/Colombo";

/* ------------------------------------------------------------------ dates */

/** How far `tz` is from UTC at `date`, in milliseconds. */
function zoneOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/** The instant at which the given wall-clock moment occurs in `tz`. */
function zonedInstant(year: number, month: number, day: number, tz: string): Date {
  const guess = Date.UTC(year, month - 1, day);
  // Two passes settle the offset even when the guess lands on the wrong side
  // of a transition.
  const once = guess - zoneOffsetMs(new Date(guess), tz);
  return new Date(guess - zoneOffsetMs(new Date(once), tz));
}

export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

/** The current month in the reporting timezone, as `YYYY-MM`. */
export function currentPeriod(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TZ,
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  return parts.slice(0, 7);
}

export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function periodRange(period: string): { start: Date; end: Date } {
  const [y, m] = period.split("-").map(Number);
  return {
    start: zonedInstant(y, m, 1, REPORT_TZ),
    end: zonedInstant(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1, REPORT_TZ),
  };
}

export function formatPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The last `count` periods, oldest first, ending at `period`. */
export function recentPeriods(period: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftPeriod(period, i - (count - 1)));
}

/* ------------------------------------------------------------ raw queries */

export interface PeriodFacts {
  period: string;
  /** confirmed orders placed in the period */
  orders: number;
  /** confirmed revenue in cents (all online orders, incl. delivery fees) */
  revenueCents: number;
  /** the slice of revenue that actually went through the payment gateway */
  gatewayRevenueCents: number;
  /** cost of goods sold, from the cost snapshotted onto each order item */
  cogsCents: number;
  /** order lines with no cost recorded — margins are understated by these */
  uncostedLines: number;
  totalLines: number;
  /** distinct customers (by email) who ordered in the period */
  customers: number;
  /** of those, how many had ever ordered before the period ended */
  repeatCustomers: number;
  /** of those, how many placed their first-ever order in this period */
  newCustomers: number;
  /** distinct localStorage ids seen on the storefront */
  visitors: number;
  sessions: number;
  pageviews: number;
  /** orders that reached the gateway, and those it confirmed */
  paymentAttempts: number;
  paymentSuccesses: number;
}

const EMPTY_FACTS: Omit<PeriodFacts, "period"> = {
  orders: 0,
  revenueCents: 0,
  gatewayRevenueCents: 0,
  cogsCents: 0,
  uncostedLines: 0,
  totalLines: 0,
  customers: 0,
  repeatCustomers: 0,
  newCustomers: 0,
  visitors: 0,
  sessions: 0,
  pageviews: 0,
  paymentAttempts: 0,
  paymentSuccesses: 0,
};

/** Everything the formulas need for one month, in a single round trip. */
export async function getPeriodFacts(period: string): Promise<PeriodFacts> {
  const db = getDb();
  const { start, end } = periodRange(period);
  // postgres-js will not bind a JS Date into a raw fragment — send ISO text
  // and let Postgres cast it.
  const from = sql`${start.toISOString()}::timestamptz`;
  const to = sql`${end.toISOString()}::timestamptz`;

  const rows = await db.execute<{
    orders: number;
    revenue_cents: number;
    gateway_revenue_cents: number;
    cogs_cents: number;
    uncosted_lines: number;
    total_lines: number;
    customers: number;
    repeat_customers: number;
    new_customers: number;
    visitors: number;
    sessions: number;
    pageviews: number;
    payment_attempts: number;
    payment_successes: number;
  }>(sql`
    with confirmed as (
      select id, lower(customer_email) as email, total_cents, payment_method
      from orders
      where created_at >= ${from} and created_at < ${to}
        and status not in ('pending_payment', 'cancelled')
    ),
    -- lifetime view of every customer who bought in this period
    lifetime as (
      select lower(o.customer_email) as email,
             min(o.created_at) as first_order_at,
             count(*) as lifetime_orders
      from orders o
      where o.status not in ('pending_payment', 'cancelled')
        and o.created_at < ${to}
      group by 1
    ),
    active as (
      select l.email, l.first_order_at, l.lifetime_orders
      from lifetime l
      where l.email in (select email from confirmed)
    ),
    lines as (
      select oi.unit_cost_cents, oi.quantity
      from order_items oi
      join confirmed c on c.id = oi.order_id
    ),
    visits as (
      select visitor_id, session_id
      from site_visits
      where created_at >= ${from} and created_at < ${to}
    ),
    payments as (
      select pe.order_id, pe.status_code
      from payment_events pe
      where pe.created_at >= ${from} and pe.created_at < ${to}
        and pe.order_id is not null
    )
    select
      (select count(*) from confirmed)::int as orders,
      (select coalesce(sum(total_cents), 0) from confirmed)::bigint as revenue_cents,
      (select coalesce(sum(total_cents) filter (where payment_method = 'payhere'), 0)
         from confirmed)::bigint as gateway_revenue_cents,
      (select coalesce(sum(unit_cost_cents * quantity), 0) from lines)::bigint as cogs_cents,
      (select count(*) filter (where unit_cost_cents = 0) from lines)::int as uncosted_lines,
      (select count(*) from lines)::int as total_lines,
      (select count(*) from active)::int as customers,
      (select count(*) filter (where lifetime_orders >= 2) from active)::int as repeat_customers,
      (select count(*) filter (where first_order_at >= ${from}) from active)::int as new_customers,
      (select count(distinct visitor_id) from visits)::int as visitors,
      (select count(distinct session_id) from visits)::int as sessions,
      (select count(*) from visits)::int as pageviews,
      (select count(distinct order_id) from payments)::int as payment_attempts,
      (select count(distinct order_id) filter (where status_code = '2') from payments)::int
        as payment_successes
  `);

  const r = rows[0];
  if (!r) return { period, ...EMPTY_FACTS };

  return {
    period,
    orders: Number(r.orders),
    revenueCents: Number(r.revenue_cents),
    gatewayRevenueCents: Number(r.gateway_revenue_cents),
    cogsCents: Number(r.cogs_cents),
    uncostedLines: Number(r.uncosted_lines),
    totalLines: Number(r.total_lines),
    customers: Number(r.customers),
    repeatCustomers: Number(r.repeat_customers),
    newCustomers: Number(r.new_customers),
    visitors: Number(r.visitors),
    sessions: Number(r.sessions),
    pageviews: Number(r.pageviews),
    paymentAttempts: Number(r.payment_attempts),
    paymentSuccesses: Number(r.payment_successes),
  };
}

/** Staff-entered figures for a month, falling back to sensible defaults. */
export async function getKpiInputs(period: string): Promise<KpiInputs | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(kpiInputs)
    .where(eq(kpiInputs.period, period))
    .limit(1);
  return row ?? null;
}

export const DEFAULT_GATEWAY_FEE_BPS = 330;
export const DEFAULT_LIFESPAN_MONTHS = 36;

/** Revenue and order count per month, for the trend chart. */
export async function getMonthlyTrend(
  period: string,
  months = 12,
): Promise<{ period: string; revenueCents: number; orders: number }[]> {
  const db = getDb();
  const periods = recentPeriods(period, months);
  const { start } = periodRange(periods[0]);
  const { end } = periodRange(periods[periods.length - 1]);

  const rows = await db
    .select({
      bucket: sql<string>`to_char(${orders.createdAt} at time zone ${sql.raw(
        `'${REPORT_TZ}'`,
      )}, 'YYYY-MM')`,
      revenueCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::bigint`,
      orders: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end), CONFIRMED))
    .groupBy(sql`1`);

  const byPeriod = new Map(
    rows.map((r) => [r.bucket, { revenue: Number(r.revenueCents), orders: Number(r.orders) }]),
  );

  return periods.map((p) => ({
    period: p,
    revenueCents: byPeriod.get(p)?.revenue ?? 0,
    orders: byPeriod.get(p)?.orders ?? 0,
  }));
}

/* ----------------------------------------------------------------- metrics */

export type MetricFormat = "money" | "percent" | "number";

export interface Metric {
  key: string;
  label: string;
  /** the formula as the business defines it, shown on the card */
  formula: string;
  /** null when an input is missing — never fake a zero */
  value: number | null;
  format: MetricFormat;
  /** same metric for the previous month, for the delta chip */
  previous: number | null;
  /** the actual numbers that went in, e.g. "48 orders ÷ 1,204 visitors" */
  workings?: string;
  /** why the value is null, or a caveat about how it was derived */
  note?: string;
  /** a higher number is not always better (cost metrics) */
  higherIsBetter: boolean;
}

const div = (a: number, b: number): number | null => (b === 0 ? null : a / b);

export interface KpiReport {
  period: string;
  previousPeriod: string;
  facts: PeriodFacts;
  previousFacts: PeriodFacts;
  inputs: KpiInputs | null;
  metrics: Metric[];
  /** cards that cannot be computed until staff fill in the inputs page */
  missingInputs: string[];
  /** order lines with no cost — profit figures understate cost while > 0 */
  uncostedLines: number;
  grossProfitCents: number | null;
  gatewayFeesCents: number;
}

/**
 * Build the full report for a month. `previous` drives every delta chip and
 * the Revenue Growth metric.
 */
export async function buildKpiReport(period: string): Promise<KpiReport> {
  const previousPeriod = shiftPeriod(period, -1);

  const [facts, previousFacts, inputs, previousInputs] = await Promise.all([
    getPeriodFacts(period),
    getPeriodFacts(previousPeriod),
    getKpiInputs(period),
    getKpiInputs(previousPeriod),
  ]);

  const feeBps = inputs?.gatewayFeeBps ?? DEFAULT_GATEWAY_FEE_BPS;
  const lifespanMonths = inputs?.customerLifespanMonths ?? DEFAULT_LIFESPAN_MONTHS;

  const offlineRevenue = inputs?.offlineRevenueCents ?? 0;
  const marketingCost = inputs?.marketingCostCents ?? 0;
  const digitalInvestment = inputs?.digitalInvestmentCents ?? 0;

  /* --- derived money ------------------------------------------------- */

  const onlineRevenue = facts.revenueCents;
  const totalRevenue = onlineRevenue + offlineRevenue;
  const gatewayFees = Math.round((facts.gatewayRevenueCents * feeBps) / 10_000);
  const prevGatewayFees = Math.round(
    (previousFacts.gatewayRevenueCents *
      (previousInputs?.gatewayFeeBps ?? DEFAULT_GATEWAY_FEE_BPS)) /
      10_000,
  );

  const grossProfit = onlineRevenue - facts.cogsCents;
  const prevGrossProfit = previousFacts.revenueCents - previousFacts.cogsCents;

  // What the digital channel actually contributed, net of the costs of
  // running it: margin on goods, less gateway fees, less marketing.
  const incrementalProfit = grossProfit - gatewayFees - marketingCost;
  const prevIncrementalProfit =
    prevGrossProfit - prevGatewayFees - (previousInputs?.marketingCostCents ?? 0);

  /* --- helpers -------------------------------------------------------- */

  const aov = div(onlineRevenue, facts.orders);
  const prevAov = div(previousFacts.revenueCents, previousFacts.orders);
  const frequency = div(facts.orders, facts.customers);
  const prevFrequency = div(previousFacts.orders, previousFacts.customers);

  const money = (cents: number) =>
    `Rs ${Math.round(cents / 100).toLocaleString("en-LK")}`;
  const num = (n: number) => n.toLocaleString("en-LK");

  const missingInputs: string[] = [];
  const needs = (label: string) => {
    if (!missingInputs.includes(label)) missingInputs.push(label);
    return `Enter ${label} on the Inputs page.`;
  };

  /* --- the eleven metrics --------------------------------------------- */

  const metrics: Metric[] = [
    {
      key: "online-revenue",
      label: "Online Revenue",
      formula: "Online Orders × AOV",
      value: onlineRevenue,
      format: "money",
      previous: previousFacts.revenueCents,
      workings:
        facts.orders > 0 && aov !== null
          ? `${num(facts.orders)} orders × ${money(Math.round(aov))} AOV`
          : "No confirmed orders this month",
      higherIsBetter: true,
    },
    {
      key: "revenue-growth",
      label: "Revenue Growth %",
      formula: "(Current − Previous) ÷ Previous × 100",
      value:
        previousFacts.revenueCents === 0
          ? null
          : ((onlineRevenue - previousFacts.revenueCents) /
              previousFacts.revenueCents) *
            100,
      format: "percent",
      previous: null,
      workings:
        previousFacts.revenueCents === 0
          ? undefined
          : `(${money(onlineRevenue)} − ${money(previousFacts.revenueCents)}) ÷ ${money(
              previousFacts.revenueCents,
            )}`,
      note:
        previousFacts.revenueCents === 0
          ? `No revenue in ${formatPeriod(previousPeriod)} to grow from.`
          : undefined,
      higherIsBetter: true,
    },
    {
      key: "digital-sales",
      label: "Digital Sales %",
      formula: "Online Revenue ÷ Total Revenue × 100",
      value: totalRevenue === 0 ? null : (onlineRevenue / totalRevenue) * 100,
      format: "percent",
      previous:
        previousFacts.revenueCents + (previousInputs?.offlineRevenueCents ?? 0) === 0
          ? null
          : (previousFacts.revenueCents /
              (previousFacts.revenueCents + (previousInputs?.offlineRevenueCents ?? 0))) *
            100,
      workings:
        totalRevenue === 0
          ? undefined
          : `${money(onlineRevenue)} online ÷ ${money(totalRevenue)} total`,
      note:
        offlineRevenue === 0
          ? inputs
            ? "Offline revenue is recorded as zero, so this reads 100%."
            : needs("offline (walk-in) revenue")
          : undefined,
      higherIsBetter: true,
    },
    {
      key: "aov",
      label: "Average Order Value",
      formula: "Revenue ÷ Number of Orders",
      value: aov,
      format: "money",
      previous: prevAov,
      workings:
        aov === null
          ? undefined
          : `${money(onlineRevenue)} ÷ ${num(facts.orders)} orders`,
      note: aov === null ? "No confirmed orders this month." : undefined,
      higherIsBetter: true,
    },
    {
      key: "conversion",
      label: "Conversion Rate",
      formula: "Orders ÷ Website Visitors × 100",
      value: facts.visitors === 0 ? null : (facts.orders / facts.visitors) * 100,
      format: "percent",
      previous:
        previousFacts.visitors === 0
          ? null
          : (previousFacts.orders / previousFacts.visitors) * 100,
      workings:
        facts.visitors === 0
          ? undefined
          : `${num(facts.orders)} orders ÷ ${num(facts.visitors)} visitors`,
      note:
        facts.visitors === 0
          ? "No visitors recorded yet — tracking starts from the first storefront page view after this release."
          : undefined,
      higherIsBetter: true,
    },
    {
      key: "repeat-purchase",
      label: "Repeat Purchase %",
      formula: "Repeat Customers ÷ Total Customers × 100",
      value: div(facts.repeatCustomers * 100, facts.customers),
      format: "percent",
      previous: div(previousFacts.repeatCustomers * 100, previousFacts.customers),
      workings:
        facts.customers === 0
          ? undefined
          : `${num(facts.repeatCustomers)} returning ÷ ${num(facts.customers)} customers`,
      note:
        facts.customers === 0
          ? "No customers this month."
          : "A customer counts as returning once they have two or more lifetime orders.",
      higherIsBetter: true,
    },
    {
      key: "cac",
      label: "Customer Acquisition Cost",
      formula: "Marketing Cost ÷ New Customers",
      value:
        marketingCost === 0 || facts.newCustomers === 0
          ? null
          : marketingCost / facts.newCustomers,
      format: "money",
      previous:
        (previousInputs?.marketingCostCents ?? 0) === 0 || previousFacts.newCustomers === 0
          ? null
          : (previousInputs?.marketingCostCents ?? 0) / previousFacts.newCustomers,
      workings:
        marketingCost > 0 && facts.newCustomers > 0
          ? `${money(marketingCost)} ÷ ${num(facts.newCustomers)} new customers`
          : undefined,
      note:
        marketingCost === 0
          ? needs("marketing cost")
          : facts.newCustomers === 0
            ? "No first-time customers this month."
            : undefined,
      higherIsBetter: false,
    },
    {
      key: "clv",
      label: "Customer Lifetime Value",
      formula: "AOV × Purchase Frequency × Customer Lifespan",
      value:
        aov === null || frequency === null ? null : aov * frequency * lifespanMonths,
      format: "money",
      previous:
        prevAov === null || prevFrequency === null
          ? null
          : prevAov *
            prevFrequency *
            (previousInputs?.customerLifespanMonths ?? DEFAULT_LIFESPAN_MONTHS),
      workings:
        aov !== null && frequency !== null
          ? `${money(Math.round(aov))} × ${frequency.toFixed(2)} orders/month × ${lifespanMonths} months`
          : undefined,
      note:
        aov === null || frequency === null
          ? "Needs at least one customer this month."
          : `Assumes a ${lifespanMonths}-month customer lifespan${inputs ? "" : " (default)"}.`,
      higherIsBetter: true,
    },
    {
      key: "payment-success",
      label: "Payment Success %",
      formula: "Successful Payments ÷ Attempts × 100",
      value: div(facts.paymentSuccesses * 100, facts.paymentAttempts),
      format: "percent",
      previous: div(
        previousFacts.paymentSuccesses * 100,
        previousFacts.paymentAttempts,
      ),
      workings:
        facts.paymentAttempts === 0
          ? undefined
          : `${num(facts.paymentSuccesses)} succeeded ÷ ${num(facts.paymentAttempts)} attempts`,
      note:
        facts.paymentAttempts === 0
          ? "No gateway payment attempts this month."
          : undefined,
      higherIsBetter: true,
    },
    {
      key: "transaction-cost",
      label: "Transaction Cost %",
      formula: "Gateway Fees ÷ Online Revenue × 100",
      value: div(gatewayFees * 100, onlineRevenue),
      format: "percent",
      previous: div(prevGatewayFees * 100, previousFacts.revenueCents),
      workings:
        onlineRevenue === 0
          ? undefined
          : `${money(gatewayFees)} fees ÷ ${money(onlineRevenue)} revenue`,
      note:
        onlineRevenue === 0
          ? "No online revenue this month."
          : `Fees estimated at ${(feeBps / 100).toFixed(2)}% of the ${money(
              facts.gatewayRevenueCents,
            )} that went through the gateway.`,
      higherIsBetter: false,
    },
    {
      key: "roi",
      label: "ROI",
      formula: "Incremental Profit ÷ Digital Investment × 100",
      value:
        digitalInvestment === 0 ? null : (incrementalProfit / digitalInvestment) * 100,
      format: "percent",
      previous:
        (previousInputs?.digitalInvestmentCents ?? 0) === 0
          ? null
          : (prevIncrementalProfit / (previousInputs?.digitalInvestmentCents ?? 1)) * 100,
      workings:
        digitalInvestment === 0
          ? undefined
          : `${money(incrementalProfit)} profit ÷ ${money(digitalInvestment)} invested`,
      note:
        digitalInvestment === 0
          ? needs("digital investment")
          : `Incremental profit = ${money(grossProfit)} gross profit − ${money(
              gatewayFees,
            )} fees − ${money(marketingCost)} marketing.`,
      higherIsBetter: true,
    },
  ];

  return {
    period,
    previousPeriod,
    facts,
    previousFacts,
    inputs,
    metrics,
    missingInputs,
    uncostedLines: facts.uncostedLines,
    grossProfitCents: facts.orders === 0 ? null : grossProfit,
    gatewayFeesCents: gatewayFees,
  };
}

/* ---------------------------------------------------------------- display */

export function formatMetric(value: number | null, format: MetricFormat): string {
  if (value === null || !Number.isFinite(value)) return "—";
  switch (format) {
    case "money":
      return `Rs ${Math.round(value / 100).toLocaleString("en-LK")}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "number":
      return value.toLocaleString("en-LK", { maximumFractionDigits: 2 });
  }
}

/** Percentage change between two comparable values, or null if undefined. */
export function delta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
