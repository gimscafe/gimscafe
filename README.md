# Sugar & Bloom — Cake Studio storefront

A production-ready web app for a cake bakery: a public storefront with a browsable
cake menu, a guest checkout that captures delivery/collection orders, online
payment through **PayHere**, and a password-protected **staff dashboard** for
managing cakes, categories and orders.

Built to deploy on **Railway** (Postgres + app) with **Cloudflare** in front for
DNS/CDN.

---

## Features

**Storefront**
- Landing page with featured cakes, occasions and "how it works"
- Full cake menu with category filtering and product detail pages
- Cookie-based cart (no account needed) with per-item cake messages
- Guest checkout: contact details, delivery **or** free collection, date picker
  that enforces each cake's lead time, baker notes
- Delivery fee rules (flat fee + free over a threshold), all configurable by env
- PayHere payment redirect + server-to-server payment confirmation webhook
- Order confirmation / status page with a "retry payment" path
- SEO: metadata, `sitemap.xml`, `robots.txt`, Open Graph
- Light/dark theme, responsive, accessible components

**Staff dashboard** (`/admin`)
- Sign in with a seeded admin account (session cookie, scrypt-hashed password)
- Dashboard KPIs (orders, awaiting payment, in progress, confirmed revenue)
- **KPI dashboard** (`/admin/kpi`): eleven business metrics for any month, each
  showing its formula and the numbers behind it, with a month-on-month delta and
  a 12-month revenue trend. See [KPI dashboard](#kpi-dashboard) below.
- **Analytics dashboard** (`/admin/analytics`): the visual read on trading —
  headline tiles with sparklines, a daily revenue trend, a storefront funnel, an
  order heatmap, best-sellers, category mix, new-vs-returning cohorts, traffic
  sources and the kitchen's next fortnight. See
  [Analytics dashboard](#analytics-dashboard) below.
- Orders: filter by status, view full detail, change status, see the PayHere
  payment log
- Cakes: create / edit / delete, drag-and-drop JPG/PNG upload for the main image
  and the gallery (or paste a URL), availability & "featured" toggles, lead time,
  sort order
- **Cost & margin**: every cake carries a "cost to make"; the bulk editor at
  `/admin/products/costs` sets them all in one pass, and each order snapshots the
  cost at purchase time so historical margins stay correct
- Categories: create / delete

## Tech stack

| Layer | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, Server Actions, React 19) |
| Styling | Tailwind CSS v4 + shadcn/ui (`base-nova` / Base UI) |
| Database | PostgreSQL via Drizzle ORM + `postgres` (postgres.js) |
| Payments | PayHere Checkout API + notify webhook |
| Auth | Custom cookie session (HMAC-signed), scrypt password hashing |
| Hosting | Railway (app + Postgres) |
| DNS / CDN | Cloudflare |

---

## Local development

### 1. Prerequisites
- Node.js 20.9+
- A PostgreSQL 14+ database

  On Windows you likely already have `postgresql-x64-17` installed but stopped —
  start it from **Services** (or an elevated `net start postgresql-x64-17`), then
  create a database:
  ```bash
  createdb -U postgres bakery
  ```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Then edit `.env.local`:
- `DATABASE_URL` — your Postgres connection string
- `DATABASE_SSL=disable` for a local server
- `AUTH_SECRET` — `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — your dashboard login
- Leave `PAYHERE_*` blank for now (checkout falls back to "pay on collection")

### 3. Create the schema and seed data
```bash
npm install
npm run db:migrate:local   # apply migrations from ./drizzle
npm run db:seed            # 5 categories, 14 cakes, the admin user
```

### 4. Run
```bash
npm run dev
```
- Storefront: http://localhost:3100
- Dashboard: http://localhost:3100/admin

  (dev runs on **3100** to avoid the POS app on 3000 — change `-p` in
  `package.json` › `scripts.dev` if you prefer another port)

### Useful scripts
| Script | Purpose |
|--------|---------|
| `npm run db:generate` | Generate a new migration after editing `src/db/schema.ts` |
| `npm run db:migrate:local` | Apply migrations locally (`.env.local`) |
| `npm run db:push` | Push schema straight to the DB (dev only, no migration file) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | (Re)seed catalogue + admin — safe to re-run |
| `npm run db:backfill-costs` | Copy current cake costs onto older order lines (add `-- --dry-run` to preview) |
| `npm run admin:create -- <email> <password>` | Create or reset a dashboard admin. With no args it uses `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Upserts by email, so re-running resets that user's password |
| `npm run admin:create:prod -- <email> <password>` | The same, without `dotenv` — for the Railway shell, where the environment is already injected |
| `npm run build` / `npm start` | Production build / serve |

---

## PayHere setup

> Full developer guide — flow, env vars, local test scripts, go-live steps,
> troubleshooting table: [`docs/PAYHERE.md`](docs/PAYHERE.md).

### The domain rule (this is what "Unauthorized payment request" means)

PayHere's checkout only accepts a request whose `merchant_id` + `hash` were
generated with the **Merchant Secret of an *approved domain*** on the account,
**and** whose `return_url` / `cancel_url` / `notify_url` all live on that same
approved domain. Get any of that wrong and PayHere shows
*"Unauthorized payment request — this is a merchant's error"*.

- **Sandbox:** `localhost` is the only host approved automatically. Add it under
  **Settings → Domains & Credentials → Add Domain → `localhost`** and copy the
  Merchant Secret it generates.
- **Shared sub-domains are rejected.** `*.up.railway.app`, `*.vercel.app`,
  `*.trycloudflare.com`, free ngrok, etc. cannot be added — you need a
  **registrable domain you own** (see [Cloudflare](#cloudflare) below).
- The **App ID / App Secret** from *Settings → API & Webhooks* ("Create API") is
  a different, OAuth credential for the REST APIs — **not** what checkout uses.

### Env vars

```
PAYHERE_MERCHANT_ID=1XXXXXX
PAYHERE_MERCHANT_SECRET=<the secret shown for your approved domain>
PAYHERE_MODE=sandbox            # only the exact word "live" flips to production
NEXT_PUBLIC_SITE_URL=https://your-domain.lk   # host must equal the approved domain
```

`NEXT_PUBLIC_SITE_URL` is inlined at **build time** — after changing it you must
redeploy, not just restart. `PAYHERE_DEBUG=1` logs the outgoing (non-secret)
checkout fields. `PAYHERE_NOTIFY_URL` can override just the callback URL, but it
must still be on an approved domain.

### Payment flow

- Checkout creates a `pending_payment` order, then redirects the browser to
  PayHere with a signed `hash`.
- On completion PayHere makes a server-to-server `POST` to `/api/payhere/notify`;
  the `md5sig` is verified and the order moves to `paid` (or `cancelled`).
  **This callback — not the browser redirect — is what marks an order paid**, so
  `notify_url` must be reachable from PayHere's servers.
- The customer is returned to `/order/‹id›`.

### Testing

- **Sandbox test card:** `4916217501611292`, exp `12/25`, CVV `123`, OTP
  `123456` (see <https://support.payhere.lk/api-&-mobile-sdk/sandbox-mode>).
- **Local dev:** PayHere can't call `http://localhost`, so after paying in the
  browser run
  `npx dotenv -e .env.local -- tsx scripts/fire-notify.mts SB-XXXXXX` to deliver
  the same signed callback (`-2` / `-1` as a 2nd arg simulates failed /
  cancelled). `scripts/payhere-smoke.mts` posts a checkout form straight to
  PayHere to confirm the credentials + domain are accepted.

If `PAYHERE_MERCHANT_ID` is blank, the app still works — orders are placed as
`pending_payment` with "pay on collection / bank transfer" instructions.

---

## Deploying to Railway

1. **Create the project** and push this repo (or connect GitHub).
2. **Add a PostgreSQL** service (New → Database → PostgreSQL). Railway injects
   `DATABASE_URL` into the app service automatically. On Railway's private network
   set `DATABASE_SSL=disable`.
3. **App service → Variables:**
   ```
   NEXT_PUBLIC_SITE_URL = https://your-domain.lk
   AUTH_SECRET          = <48+ random bytes hex>
   ADMIN_EMAIL          = owner@your-domain.lk
   ADMIN_PASSWORD       = <strong password>
   DELIVERY_FEE_LKR     = 600
   FREE_DELIVERY_OVER_LKR = 15000
   DEFAULT_LEAD_TIME_DAYS = 2
   UPLOAD_DIR           = /data/uploads
   PAYHERE_MERCHANT_ID  = ...
   PAYHERE_MERCHANT_SECRET = ...
   PAYHERE_MODE         = live
   ```
4. **Persistent image uploads:** add a **Volume** to the app service mounted at
   `/data`, and keep `UPLOAD_DIR=/data/uploads`. (Product images can also just be
   external URLs, in which case no volume is needed.)
5. **Migrations** run automatically on every deploy via
   `deploy.preDeployCommand` in `railway.json` (`npm run db:migrate`).
6. **Seed once** (first deploy only) from the Railway shell:
   ```bash
   npm run db:seed:prod
   ```
7. `railway.json` already sets build (`Nixpacks`), start command and a `/`
   healthcheck.

### Cloudflare

1. Register the domain (Cloudflare Registrar or anywhere) and add it to
   Cloudflare; point the nameservers.
2. In Railway, app service → **Settings → Networking → Custom Domain**, add
   `your-domain.lk` (and `www`). Railway shows a `CNAME` target.
3. In Cloudflare **DNS** add a `CNAME` (`@` / `www`) to that target, **Proxied**
   (orange cloud).
4. **SSL/TLS → Overview → Full (strict)**. Railway serves a valid cert;
   *Flexible* causes a redirect loop.
5. **Let PayHere's webhook through.** Cloudflare bot/security features can
   challenge PayHere's server-to-server `POST` and the order then never flips to
   paid. Add a **WAF → Custom rule**: *when* URI Path equals
   `/api/payhere/notify` *then* **Skip** → Managed rules, Bot Fight Mode, Rate
   limiting. Also keep the default "no cache on `/api/*`" (route is
   `force-dynamic`, but a Cache Rule bypass makes it explicit).
6. Set on Railway and **redeploy**:
   - `NEXT_PUBLIC_SITE_URL = https://your-domain.lk` (exact host, no trailing `/`)
   - `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` = a stable 32-byte base64 string
     (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`),
     so checkout Server Actions keep working across redeploys / multiple
     instances.
7. In **PayHere → Settings → Domains & Credentials** add `your-domain.lk`
   (no `https://`, no path). Wait for status **Allowed**, then copy *that
   domain's* Merchant Secret into `PAYHERE_MERCHANT_SECRET`.
8. Only after the live domain is approved, set `PAYHERE_MODE=live` and swap in
   the **live** dashboard's Merchant ID + Secret.

`next.config.ts` reads `NEXT_PUBLIC_SITE_URL` to whitelist the domain for
Server Action CSRF checks behind the proxy — no code change needed when the
domain changes, just the env var + redeploy.

---

## Project structure

```
src/
  app/
    (storefront)         page.tsx, cakes/, cart/, checkout/, order/, about/, ...
    admin/
      login/             sign-in
      (dash)/            protected dashboard (layout calls requireAdmin)
      actions.ts         admin server actions
    actions/             cart.ts, checkout.ts (storefront server actions)
    api/
      payhere/notify/    payment webhook
      track/             first-party page-view beacon (feeds Conversion Rate)
      uploads/           image upload + serve
  components/            UI + storefront + admin components
  db/                    schema.ts, index.ts (lazy pool), seed.ts
  lib/                   site config, money, cart, auth, payhere, catalog, orders,
                         kpi, analytics
  components/admin/charts/  reusable chart primitives (kit, area, funnel, bars,
                         share, stacked columns, heatmap, stat tile)
drizzle/                 generated SQL migrations (commit these)
```

## Analytics dashboard

`/admin/analytics` is the visual counterpart to the KPI page: where the KPI
dashboard answers "what are the numbers this month", this one answers "what is
actually happening". One date-range control at the top (7 / 30 / 90 days or
12 months) scopes every panel, and each figure is compared against the equally
long window immediately before it.

| Panel | Form | What it answers |
|---|---|---|
| Headline tiles | stat tiles + sparkline | Revenue, orders, AOV, gross profit, visitors, page views |
| Revenue per day | area + crosshair | Which days actually sell |
| Storefront funnel | ordinal bars | Where visitors drop out on the way to ordering |
| When orders come in | heatmap | Which day and hour to staff the kitchen for |
| Best-selling cakes | bar list | What to keep making |
| Revenue by category | stacked share bar | Which side of the menu earns |
| New vs returning | stacked columns | Growth from new faces or from loyalty |
| Delivery vs collection | share bar | How orders are fulfilled |
| Traffic sources / pages | bar lists | Where visitors come from and what they read |
| Order status / delivery areas | bar lists | Operational state and where to drive |
| Coming up in the kitchen | columns | Orders due over the next 14 days |

### About the charts

Colour is doing one of two jobs and never both at once. **Categorical** slots
encode identity (which series) in a fixed order that is never cycled or
reassigned by rank, so a segment keeps its hue when a filter changes. A single
**rose ramp** encodes magnitude and order — heat cells and funnel stages —
light to dark in one hue. Both scales live as CSS custom properties
(`--series-*`, `--ramp-*`) in `globals.css`, are stepped separately for the dark
surface rather than flipped, and were checked with a palette validator in each
mode for the lightness band, chroma floor, colour-blind separation and contrast.

Every chart carries a "View as table" disclosure, and any chart with two or more
series carries a legend — identity is never colour alone.

## KPI dashboard

`/admin/kpi` reports eleven metrics for one calendar month, compared against the
month before. Month boundaries are cut in `REPORT_TIMEZONE` (default
`Asia/Colombo`), not UTC.

| Metric | Formula | Source |
|---|---|---|
| Online Revenue | Online Orders × AOV | confirmed orders |
| Revenue Growth % | (Current − Previous) ÷ Previous × 100 | confirmed orders |
| Digital Sales % | Online Revenue ÷ Total Revenue × 100 | orders + offline revenue input |
| Average Order Value | Revenue ÷ Number of Orders | confirmed orders |
| Conversion Rate | Orders ÷ Website Visitors × 100 | orders + visit tracking |
| Repeat Purchase % | Repeat Customers ÷ Total Customers × 100 | orders, grouped by email |
| Customer Acquisition Cost | Marketing Cost ÷ New Customers | marketing cost input |
| Customer Lifetime Value | AOV × Frequency × Lifespan | orders + lifespan assumption |
| Payment Success % | Successful Payments ÷ Attempts × 100 | `payment_events` |
| Transaction Cost % | Gateway Fees ÷ Online Revenue × 100 | orders × gateway fee rate |
| ROI | Incremental Profit ÷ Digital Investment × 100 | all of the above + investment input |

"Confirmed" means any order whose status is not `pending_payment` or
`cancelled`. Incremental Profit is gross profit (revenue − cost of goods sold)
less gateway fees and marketing cost.

**A metric with a missing input shows `—` and says what it needs** — it never
reports a misleading zero.

### What you have to fill in

Three things the storefront cannot know are entered per month at
`/admin/kpi/inputs`: offline (walk-in) revenue, marketing cost and digital
investment, plus two assumptions — the gateway fee percentage (default 3.30%)
and the average customer lifespan in months (default 36).

### Where visitor numbers come from

`components/visit-tracker.tsx` posts one row to `/api/track` per storefront page
view. A `visitorId` in `localStorage` counts unique visitors and a `sessionId` in
`sessionStorage` counts sessions; `/admin` pages are excluded. It runs in the
browser, so crawlers that do not execute JavaScript are naturally left out of the
conversion denominator. No third-party analytics, no personal data — only the
referring host is stored, never the full referring URL.

### Costs and profit

Profit, margin and ROI depend on each cake's cost. Set them at
`/admin/products/costs`. Orders snapshot `unit_cost_cents` at checkout, so
changing a cake's cost later never rewrites past margins — which also means
orders placed **before** costs were entered stay at zero until you run
`npm run db:backfill-costs`. The dashboard warns while any order line in the
period is uncosted.

## Notes / possible next steps
- Transactional email (order confirmation) is not wired up — hook a provider into
  `createOrder` / the notify handler.
- Storefront pages are `force-dynamic` for always-fresh data; add ISR/caching if
  traffic grows.
- Admin is a single shared account; extend `admin_users` for per-user logins.
