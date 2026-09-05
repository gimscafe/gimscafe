import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * Query layer for the analytics dashboard (`/admin/analytics`).
 *
 * Everything is scoped to one date range and, where a comparison is useful,
 * to the immediately preceding range of the same length. Days are bucketed in
 * the reporting timezone so "Monday" means a Colombo Monday.
 *
 * Money is in cents throughout, matching the rest of the app.
 */

const REPORT_TZ = process.env.REPORT_TIMEZONE || "Asia/Colombo";

/** Statuses that count as real, recognised revenue. */
const CONFIRMED = "status not in ('pending_payment', 'cancelled')";

export const RANGES = {
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
  "365d": { label: "Last 12 months", days: 365 },
} as const;

export type RangeKey = keyof typeof RANGES;

export function isRangeKey(v: string | undefined): v is RangeKey {
  return !!v && v in RANGES;
}

export interface Range {
  key: RangeKey;
  label: string;
  days: number;
  start: Date;
  end: Date;
  /** the equally long window immediately before `start` */
  prevStart: Date;
}

export function resolveRange(key: RangeKey): Range {
  const { label, days } = RANGES[key];
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const prevStart = new Date(start.getTime() - days * 86_400_000);
  return { key, label, days, start, end, prevStart };
}

/**
 * postgres-js will not bind a JS Date into a raw fragment, so timestamps go
 * over as ISO text and Postgres casts them.
 */
const ts = (d: Date) => sql`${d.toISOString()}::timestamptz`;
const tz = sql.raw(`'${REPORT_TZ}'`);

/* ------------------------------------------------------------------ totals */

export interface Totals {
  orders: number;
  revenueCents: number;
  cogsCents: number;
  customers: number;
  visitors: number;
  sessions: number;
  pageviews: number;
}

const ZERO_TOTALS: Totals = {
  orders: 0,
  revenueCents: 0,
  cogsCents: 0,
  customers: 0,
  visitors: 0,
  sessions: 0,
  pageviews: 0,
};

/** Headline numbers for one window. */
export async function getTotals(start: Date, end: Date): Promise<Totals> {
  const db = getDb();
  const [row] = await db.execute<Record<string, number>>(sql`
    with confirmed as (
      select id, lower(customer_email) as email, total_cents
      from orders
      where created_at >= ${ts(start)} and created_at < ${ts(end)}
        and ${sql.raw(CONFIRMED)}
    )
    select
      (select count(*) from confirmed)::int as orders,
      (select coalesce(sum(total_cents), 0) from confirmed)::bigint as revenue_cents,
      (select coalesce(sum(oi.unit_cost_cents * oi.quantity), 0)
         from order_items oi join confirmed c on c.id = oi.order_id)::bigint as cogs_cents,
      (select count(distinct email) from confirmed)::int as customers,
      (select count(distinct visitor_id) from site_visits
         where created_at >= ${ts(start)} and created_at < ${ts(end)})::int as visitors,
      (select count(distinct session_id) from site_visits
         where created_at >= ${ts(start)} and created_at < ${ts(end)})::int as sessions,
      (select count(*) from site_visits
         where created_at >= ${ts(start)} and created_at < ${ts(end)})::int as pageviews
  `);
  if (!row) return ZERO_TOTALS;
  return {
    orders: Number(row.orders),
    revenueCents: Number(row.revenue_cents),
    cogsCents: Number(row.cogs_cents),
    customers: Number(row.customers),
    visitors: Number(row.visitors),
    sessions: Number(row.sessions),
    pageviews: Number(row.pageviews),
  };
}

/* --------------------------------------------------------------- daily series */

export interface DailyPoint {
  day: string; // YYYY-MM-DD in the reporting timezone
  revenueCents: number;
  cogsCents: number;
  orders: number;
  visitors: number;
  pageviews: number;
}

/**
 * One row per day across the whole range, gap-filled — a day with no orders
 * must plot as zero, not vanish and distort the shape of the line.
 */
export async function getDailySeries(start: Date, end: Date): Promise<DailyPoint[]> {
  const db = getDb();
  const rows = await db.execute<Record<string, string | number>>(sql`
    with days as (
      select generate_series(
        date_trunc('day', ${ts(start)} at time zone ${tz}),
        date_trunc('day', ${ts(end)} at time zone ${tz}),
        interval '1 day'
      )::date as day
    ),
    o as (
      select (o.created_at at time zone ${tz})::date as day,
             count(*)::int as orders,
             coalesce(sum(o.total_cents), 0)::bigint as revenue_cents,
             coalesce(sum((
               select sum(oi.unit_cost_cents * oi.quantity)
               from order_items oi where oi.order_id = o.id
             )), 0)::bigint as cogs_cents
      from orders o
      where o.created_at >= ${ts(start)} and o.created_at < ${ts(end)}
        and o.${sql.raw(CONFIRMED)}
      group by 1
    ),
    v as (
      select (created_at at time zone ${tz})::date as day,
             count(distinct visitor_id)::int as visitors,
             count(*)::int as pageviews
      from site_visits
      where created_at >= ${ts(start)} and created_at < ${ts(end)}
      group by 1
    )
    select to_char(d.day, 'YYYY-MM-DD') as day,
           coalesce(o.orders, 0)::int as orders,
           coalesce(o.revenue_cents, 0)::bigint as revenue_cents,
           coalesce(o.cogs_cents, 0)::bigint as cogs_cents,
           coalesce(v.visitors, 0)::int as visitors,
           coalesce(v.pageviews, 0)::int as pageviews
    from days d
    left join o on o.day = d.day
    left join v on v.day = d.day
    order by d.day
  `);
  return rows.map((r) => ({
    day: String(r.day),
    orders: Number(r.orders),
    revenueCents: Number(r.revenue_cents),
    cogsCents: Number(r.cogs_cents),
    visitors: Number(r.visitors),
    pageviews: Number(r.pageviews),
  }));
}

/* ------------------------------------------------------------------- funnel */

export interface FunnelStep {
  label: string;
  value: number;
  hint: string;
}

/**
 * Storefront funnel. The first four steps come from tracked page views, the
 * last from confirmed orders — so the drop between "reached checkout" and
 * "ordered" is the one that costs money.
 */
export async function getFunnel(start: Date, end: Date): Promise<FunnelStep[]> {
  const db = getDb();
  const [row] = await db.execute<Record<string, number>>(sql`
    with v as (
      select visitor_id, path
      from site_visits
      where created_at >= ${ts(start)} and created_at < ${ts(end)}
    )
    select
      (select count(distinct visitor_id) from v)::int as visitors,
      (select count(distinct visitor_id) from v
        where path like '/cakes%')::int as browsed,
      (select count(distinct visitor_id) from v
        where path = '/cart')::int as carted,
      (select count(distinct visitor_id) from v
        where path like '/checkout%')::int as checkout,
      (select count(*) from orders
        where created_at >= ${ts(start)} and created_at < ${ts(end)}
          and ${sql.raw(CONFIRMED)})::int as ordered
  `);

  const n = (k: string) => Number(row?.[k] ?? 0);
  return [
    { label: "Visited the site", value: n("visitors"), hint: "unique visitors" },
    { label: "Browsed cakes", value: n("browsed"), hint: "viewed /cakes" },
    { label: "Opened the cart", value: n("carted"), hint: "viewed /cart" },
    { label: "Reached checkout", value: n("checkout"), hint: "viewed /checkout" },
    { label: "Placed an order", value: n("ordered"), hint: "confirmed orders" },
  ];
}

/* ------------------------------------------------------------ product mix */

export interface ProductRow {
  name: string;
  units: number;
  revenueCents: number;
  profitCents: number;
  costed: boolean;
}

export async function getTopProducts(
  start: Date,
  end: Date,
  limit = 8,
): Promise<ProductRow[]> {
  const db = getDb();
  const rows = await db.execute<Record<string, string | number>>(sql`
    select oi.product_name as name,
           sum(oi.quantity)::int as units,
           sum(oi.line_total_cents)::bigint as revenue_cents,
           sum(oi.line_total_cents - oi.unit_cost_cents * oi.quantity)::bigint as profit_cents,
           bool_and(oi.unit_cost_cents > 0) as costed
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.created_at >= ${ts(start)} and o.created_at < ${ts(end)}
      and o.${sql.raw(CONFIRMED)}
    group by 1
    order by revenue_cents desc
    limit ${limit}
  `);
  return rows.map((r) => ({
    name: String(r.name),
    units: Number(r.units),
    revenueCents: Number(r.revenue_cents),
    profitCents: Number(r.profit_cents),
    costed: Boolean(r.costed),
  }));
}

export interface ShareSlice {
  label: string;
  value: number;
}

/** Revenue split by category, largest first, with a folded "Other" tail. */
export async function getCategoryMix(
  start: Date,
  end: Date,
  keep = 5,
): Promise<ShareSlice[]> {
  const db = getDb();
  const rows = await db.execute<Record<string, string | number>>(sql`
    select coalesce(c.name, 'Uncategorised') as label,
           sum(oi.line_total_cents)::bigint as value
    from order_items oi
    join orders o on o.id = oi.order_id
    left join products p on p.id = oi.product_id
    left join categories c on c.id = p.category_id
    where o.created_at >= ${ts(start)} and o.created_at < ${ts(end)}
      and o.${sql.raw(CONFIRMED)}
    group by 1
    order by value desc
  `);

  const all = rows.map((r) => ({ label: String(r.label), value: Number(r.value) }));
  if (all.length <= keep) return all;
  // Never invent a new hue for a long tail — fold it into "Other".
  const tail = all.slice(keep).reduce((sum, s) => sum + s.value, 0);
  return [...all.slice(0, keep), { label: "Other", value: tail }];
}

/* ---------------------------------------------------------------- customers */

export interface CohortPoint {
  period: string;
  label: string;
  newOrders: number;
  returningOrders: number;
}

/**
 * Orders per month split by whether the customer had ordered before. Answers
 * "is the business growing on new faces or on loyalty?".
 */
export async function getCustomerCohorts(months = 6): Promise<CohortPoint[]> {
  const db = getDb();
  const rows = await db.execute<Record<string, string | number>>(sql`
    with ranked as (
      select lower(customer_email) as email,
             created_at,
             row_number() over (
               partition by lower(customer_email) order by created_at
             ) as seq
      from orders
      where ${sql.raw(CONFIRMED)}
    ),
    months as (
      select date_trunc('month', (now() at time zone ${tz}))
             - (interval '1 month' * generate_series(${months - 1}, 0, -1)) as m
    )
    select to_char(m.m, 'YYYY-MM') as period,
           count(*) filter (where r.seq = 1)::int as new_orders,
           count(*) filter (where r.seq > 1)::int as returning_orders
    from months m
    left join ranked r
      on date_trunc('month', (r.created_at at time zone ${tz})) = m.m
    group by m.m
    order by m.m
  `);

  return rows.map((r) => {
    const period = String(r.period);
    const [y, mo] = period.split("-").map(Number);
    return {
      period,
      label: new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      newOrders: Number(r.new_orders),
      returningOrders: Number(r.returning_orders),
    };
  });
}

/* ----------------------------------------------------------------- heatmap */

export interface HeatCell {
  dow: number; // 0 = Monday
  hour: number; // 0-23, bucketed into 3-hour blocks by the chart
  orders: number;
}

/** When orders actually come in — day of week × hour, in local time. */
export async function getOrderHeatmap(start: Date, end: Date): Promise<HeatCell[]> {
  const db = getDb();
  const rows = await db.execute<Record<string, number>>(sql`
    select
      (extract(isodow from (created_at at time zone ${tz})) - 1)::int as dow,
      extract(hour from (created_at at time zone ${tz}))::int as hour,
      count(*)::int as orders
    from orders
    where created_at >= ${ts(start)} and created_at < ${ts(end)}
      and ${sql.raw(CONFIRMED)}
    group by 1, 2
  `);
  return rows.map((r) => ({
    dow: Number(r.dow),
    hour: Number(r.hour),
    orders: Number(r.orders),
  }));
}

/* -------------------------------------------------------------- operations */

export interface LabelledCount {
  label: string;
  value: number;
  /** optional secondary figure, e.g. revenue behind the count */
  secondaryCents?: number;
}

export async function getFulfilmentMix(
  start: Date,
  end: Date,
): Promise<ShareSlice[]> {
  const db = getDb();
  const rows = await db.execute<Record<string, string | number>>(sql`
    select case when fulfillment_type = 'pickup' then 'Collection' else 'Delivery' end as label,
           count(*)::int as value
    from orders
    where created_at >= ${ts(start)} and created_at < ${ts(end)}
      and ${sql.raw(CONFIRMED)}
    group by 1
    order by value desc
  `);
  return rows.map((r) => ({ label: String(r.label), value: Number(r.value) }));
}

export async function getStatusBreakdown(
  start: Date,
  end: Date,
): Promise<LabelledCount[]> {
  const db = getDb();
  const rows = await db.execute<Record<string, string | number>>(sql`
    select status as label, count(*)::int as value,
           coalesce(sum(total_cents), 0)::bigint as revenue_cents
    from orders
    where created_at >= ${ts(start)} and created_at < ${ts(end)}
    group by 1
    order by value desc
  `);
  return rows.map((r) => ({
    label: String(r.label),
    value: Number(r.value),
    secondaryCents: Number(r.revenue_cents),
  }));
}

export async function getTopCities(
  start: Date,
  end: Date,
  limit = 6,
): Promise<LabelledCount[]> {
  const db = getDb();
  const rows = await db.execute<Record<string, string | number>>(sql`
    select initcap(trim(delivery_city)) as label, count(*)::int as value,
           coalesce(sum(total_cents), 0)::bigint as revenue_cents
    from orders
    where created_at >= ${ts(start)} and created_at < ${ts(end)}
      and ${sql.raw(CONFIRMED)}
      and fulfillment_type = 'delivery'
      and delivery_city is not null and trim(delivery_city) <> ''
    group by 1
    order by value desc
    limit ${limit}
  `);
  return rows.map((r) => ({
    label: String(r.label),
    value: Number(r.value),
    secondaryCents: Number(r.revenue_cents),
  }));
}

/** Orders due for delivery or collection over the next fortnight. */
export async function getUpcomingSchedule(days = 14): Promise<
  { day: string; label: string; orders: number; revenueCents: number }[]
> {
  const db = getDb();
  const rows = await db.execute<Record<string, string | number>>(sql`
    with days as (
      select (current_date + i)::date as day
      from generate_series(0, ${days - 1}::int) as i
    ),
    o as (
      select fulfillment_date::date as day,
             count(*)::int as orders,
             coalesce(sum(total_cents), 0)::bigint as revenue_cents
      from orders
      where status not in ('cancelled')
        and fulfillment_date ~ '^\\d{4}-\\d{2}-\\d{2}$'
        and fulfillment_date::date >= current_date
        and fulfillment_date::date < current_date + ${days}::int
      group by 1
    )
    select to_char(d.day, 'YYYY-MM-DD') as day,
           coalesce(o.orders, 0)::int as orders,
           coalesce(o.revenue_cents, 0)::bigint as revenue_cents
    from days d left join o on o.day = d.day
    order by d.day
  `);
  return rows.map((r) => {
    const day = String(r.day);
    return {
      day,
      label: new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      orders: Number(r.orders),
      revenueCents: Number(r.revenue_cents),
    };
  });
}

/* ------------------------------------------------------------------ traffic */

export async function getTrafficSources(
  start: Date,
  end: Date,
  limit = 6,
): Promise<LabelledCount[]> {
  const db = getDb();
  const rows = await db.execute<Record<string, string | number>>(sql`
    select coalesce(nullif(referrer_host, ''), 'Direct / none') as label,
           count(distinct visitor_id)::int as value
    from site_visits
    where created_at >= ${ts(start)} and created_at < ${ts(end)}
    group by 1
    order by value desc
    limit ${limit}
  `);
  return rows.map((r) => ({ label: String(r.label), value: Number(r.value) }));
}

export async function getTopPages(
  start: Date,
  end: Date,
  limit = 6,
): Promise<LabelledCount[]> {
  const db = getDb();
  const rows = await db.execute<Record<string, string | number>>(sql`
    select path as label, count(*)::int as value
    from site_visits
    where created_at >= ${ts(start)} and created_at < ${ts(end)}
    group by 1
    order by value desc
    limit ${limit}
  `);
  return rows.map((r) => ({ label: String(r.label), value: Number(r.value) }));
}
