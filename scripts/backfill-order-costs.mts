/**
 * Backfill `order_items.unit_cost_cents` from the product's current cost.
 *
 * New orders snapshot the cost at checkout, but order lines written before
 * costing existed carry 0 — which makes historical gross profit and ROI on the
 * KPI dashboard look better than reality. Run this once after filling in cake
 * costs on /admin/products/costs.
 *
 *   npx dotenv -e .env.local -- tsx scripts/backfill-order-costs.mts
 *   npx dotenv -e .env.local -- tsx scripts/backfill-order-costs.mts --dry-run
 *
 * Only rows still at 0 are touched, and only where the product still exists
 * and has a cost — so it is safe to re-run and never overwrites a real
 * snapshot.
 */
import { getDb } from "../src/db/index";
import { sql } from "drizzle-orm";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const db = getDb();

  const [pending] = await db.execute<{ lines: number; orders: number }>(sql`
    select count(*)::int as lines, count(distinct oi.order_id)::int as orders
    from order_items oi
    join products p on p.id = oi.product_id
    where oi.unit_cost_cents = 0 and p.cost_cents > 0
  `);

  const lines = Number(pending?.lines ?? 0);
  if (lines === 0) {
    const [orphans] = await db.execute<{ n: number }>(sql`
      select count(*)::int as n
      from order_items oi
      left join products p on p.id = oi.product_id
      where oi.unit_cost_cents = 0 and (p.id is null or p.cost_cents = 0)
    `);
    console.log("Nothing to backfill.");
    if (Number(orphans?.n ?? 0) > 0) {
      console.log(
        `  ${orphans.n} line(s) remain uncosted because the product was deleted ` +
          "or still has no cost. Set costs at /admin/products/costs, then re-run.",
      );
    }
    return;
  }

  console.log(
    `${lines} order line(s) across ${pending.orders} order(s) can be costed.`,
  );

  if (dryRun) {
    const preview = await db.execute<{
      order_number: string;
      product_name: string;
      quantity: number;
      cost_cents: number;
    }>(sql`
      select o.order_number, oi.product_name, oi.quantity, p.cost_cents
      from order_items oi
      join products p on p.id = oi.product_id
      join orders o on o.id = oi.order_id
      where oi.unit_cost_cents = 0 and p.cost_cents > 0
      order by o.created_at desc
      limit 20
    `);
    for (const r of preview) {
      console.log(
        `  ${r.order_number}  ${r.product_name} ×${r.quantity} → Rs ${
          Number(r.cost_cents) / 100
        } each`,
      );
    }
    console.log("\nDry run — nothing written. Re-run without --dry-run to apply.");
    return;
  }

  await db.execute(sql`
    update order_items oi
    set unit_cost_cents = p.cost_cents
    from products p
    where p.id = oi.product_id
      and oi.unit_cost_cents = 0
      and p.cost_cents > 0
  `);

  console.log(`Backfilled ${lines} order line(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
