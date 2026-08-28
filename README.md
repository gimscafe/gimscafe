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
- Orders: filter by status, view full detail, change status, see the PayHere
  payment log
- Cakes: create / edit / delete, image upload or URL, availability & "featured"
  toggles, gallery images, lead time, sort order
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
| `npm run build` / `npm start` | Production build / serve |

---

## PayHere setup

1. Create an account at <https://www.payhere.lk> and add your domain under
   **Settings → Domains & Credentials**. You'll get a **Merchant ID** and
   **Merchant Secret**.
2. Set env vars:
   ```
   PAYHERE_MERCHANT_ID=1XXXXXX
   PAYHERE_MERCHANT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxx
   PAYHERE_MODE=sandbox      # switch to "live" for production
   NEXT_PUBLIC_SITE_URL=https://your-domain.lk
   ```
3. The **Notify URL** PayHere calls is `‹NEXT_PUBLIC_SITE_URL›/api/payhere/notify`.
   It must be publicly reachable — add it in the PayHere dashboard too.
4. Payment flow:
   - Checkout creates a `pending_payment` order, then redirects the browser to
     PayHere with a signed `hash`.
   - On completion PayHere `POST`s to `/api/payhere/notify`; the signature is
     verified (`md5sig`) and the order is moved to `paid` (or `cancelled`).
   - The customer is returned to `/order/‹id›`.
5. **Sandbox test card:** `4916217501611292`, exp `12/25`, CVV `123` (see
   <https://support.payhere.lk/api-&-mobile-sdk/sandbox-mode>).

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

1. Add your domain to Cloudflare and point the nameservers.
2. In Railway, app service → **Settings → Networking → Custom Domain**, add
   `your-domain.lk`. Railway shows a `CNAME` target.
3. In Cloudflare DNS add a `CNAME` (`@` / `www`) to that target, **Proxied**.
4. SSL/TLS mode: **Full (strict)**.
5. Make sure `NEXT_PUBLIC_SITE_URL` matches the final public URL, and add that URL
   as an allowed domain in the PayHere dashboard.

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
      uploads/           image upload + serve
  components/            UI + storefront + admin components
  db/                    schema.ts, index.ts (lazy pool), seed.ts
  lib/                   site config, money, cart, auth, payhere, catalog, orders
drizzle/                 generated SQL migrations (commit these)
```

## Notes / possible next steps
- Transactional email (order confirmation) is not wired up — hook a provider into
  `createOrder` / the notify handler.
- Storefront pages are `force-dynamic` for always-fresh data; add ISR/caching if
  traffic grows.
- Admin is a single shared account; extend `admin_users` for per-user logins.
