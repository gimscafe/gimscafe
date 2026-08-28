# PayHere integration — developer guide

Everything needed to work on, test, and ship online payments for this app.
Source of truth for the code lives in `src/lib/payhere.ts`,
`src/app/api/payhere/notify/route.ts`, `src/app/checkout/pay/[orderId]/`, and
`src/lib/orders.ts` (`applyPaymentResult`).

---

## 1. The one rule that causes 90% of the pain

> PayHere shows **"Unauthorized payment request — this is a merchant's error"**
> when the request is not tied to an **approved domain** on the merchant account.

For a checkout request to be accepted, **all** of these must line up:

| Thing | Must be |
|---|---|
| `PAYHERE_MERCHANT_ID` | The account's Merchant ID |
| `PAYHERE_MERCHANT_SECRET` | The secret shown **for the approved domain**, not a random/other secret |
| `NEXT_PUBLIC_SITE_URL` host | **Exactly** that approved domain |
| `return_url` / `cancel_url` / `notify_url` | All on that same domain (they are, because they're built from `NEXT_PUBLIC_SITE_URL`) |
| `hash` | `md5(merchant_id + order_id + amount + currency + md5(secret))`, uppercased — see `checkoutHash()` |

### What is NOT accepted as a domain

- Shared subdomains: `*.up.railway.app`, `*.vercel.app`, `*.trycloudflare.com`,
  free ngrok, `*.loca.lt`. PayHere rejects them at "Add Domain".
- A different environment's credentials: sandbox creds against
  `www.payhere.lk`, or live creds against `sandbox.payhere.lk`.

### What IS accepted

- `localhost` — **auto-approved in sandbox only**. Add it under
  Settings → Domains & Credentials, copy the Merchant Secret it generates.
- Any **registrable domain you own** (`gimscafe.lk`, `shop.gimscafe.com`, …),
  once it shows status **Allowed**.

### Merchant Secret vs App Secret

- **Merchant Secret** (Settings → Domains & Credentials) → used for the checkout
  `hash` and the `md5sig` on the notify callback. **This is what this app uses.**
- **App ID / App Secret** (Settings → API & Webhooks / "Create API") → OAuth
  credentials for the REST APIs (refunds, retrieval, subscriptions). Not used
  here yet — see §7.

---

## 2. Environment variables

| Var | Where | Notes |
|---|---|---|
| `PAYHERE_MERCHANT_ID` | Railway / `.env.local` | Blank ⇒ online payment is disabled, orders fall back to "pay on collection". |
| `PAYHERE_MERCHANT_SECRET` | Railway / `.env.local` | The **approved-domain** secret. |
| `PAYHERE_MODE` | Railway / `.env.local` | Only the exact string `live` switches to `www.payhere.lk`; anything else (incl. `Live`, `production`, typos) ⇒ sandbox. |
| `NEXT_PUBLIC_SITE_URL` | Railway / `.env.local` | Host must equal the approved domain. **Inlined at build time** — redeploy, don't just restart. No trailing slash. |
| `PAYHERE_DEBUG` | optional | `1` ⇒ logs the outgoing non-secret checkout fields (`[payhere] checkout fields`). |
| `PAYHERE_NOTIFY_URL` | optional | Overrides just the callback URL. Must still be on an approved domain. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Railway (prod) | Stable 32-byte base64. Keeps encrypted Server Action payloads valid across redeploys / multiple instances. `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

---

## 3. Payment flow

```
Customer submits checkout form
  └─ placeOrder() Server Action  (src/app/actions/checkout.ts)
       └─ createOrder()  → order row, status = pending_payment, paymentMethod = payhere
          redirect → /checkout/pay/[orderId]
             └─ buildCheckoutFields()  → hidden form + signed hash
                auto-POST → https://sandbox|www.payhere.lk/pay/checkout
                   ├─ browser: PayHere hosted payment page → card / wallet / bank
                   │     └─ on finish, browser redirected to return_url = /order/[id]
                   └─ PayHere servers: POST  → /api/payhere/notify   ★ authoritative
                         └─ verifyNotification(md5sig)  → applyPaymentResult()
                               status → paid  (status_code 2) | cancelled (-1) | failed (-2)
```

**The `notify` callback — not the browser redirect — is what marks an order
paid.** The return page just shows current status; a customer who closes the tab
still gets a paid order once the callback lands. So `notify_url` must be
reachable from PayHere's servers and on an approved domain.

`status_code` map (`PAYHERE_STATUS` in `payhere.ts`): `2` success · `0` pending ·
`-1` cancelled · `-2` failed · `-3` chargedback.

---

## 4. Local development

`.env.local` uses sandbox credentials + `NEXT_PUBLIC_SITE_URL="http://localhost:3100"`.
DB: local Postgres (`postgresql://postgres:postgres@127.0.0.1:5432/bakery`);
`npm run db:migrate:local && npm run db:seed` once, then `npm run dev`.

### Helper scripts (`scripts/`, run with tsx)

| Script | Purpose |
|---|---|
| `npx tsx scripts/payhere-smoke.mts` | Builds a checkout form from `.env.local` and POSTs it straight to PayHere. Prints ✅ if the payment page comes back, ❌ on "Unauthorized". No DB/server needed — fastest way to check credentials + domain. |
| `npx dotenv -e .env.local -- tsx scripts/make-test-order.mts` | Inserts one `pending_payment` PayHere order, prints its id + pay URL. |
| `npx dotenv -e .env.local -- tsx scripts/fire-notify.mts SB-XXXXXX [status]` | Delivers the signed `notify` callback PayHere can't send to `localhost`. `status` defaults to `2`; pass `-2` / `-1` to simulate failure / cancellation. |

### Why no tunnel

PayHere validates the `notify_url` domain too, so `cloudflared` /
`trycloudflare.com` / free ngrok URLs get the same "Unauthorized" rejection as a
Railway subdomain. Use `fire-notify.mts` instead. A **named** cloudflared tunnel
on a domain you own and have approved in PayHere would work, but that's the same
prerequisite as production.

### Sandbox test card

`4916217501611292` · exp `12/25` · CVV `123` · OTP `123456`
(<https://support.payhere.lk/api-&-mobile-sdk/sandbox-mode>)

---

## 5. Going live with a custom domain (Cloudflare + Railway)

1. **Register a domain** (Cloudflare Registrar or any registrar) and add it to
   Cloudflare; point nameservers.
2. **Railway** → app service → Settings → Networking → **Custom Domain** → add
   `yourdomain.com` (and `www`). Copy the CNAME target Railway shows.
3. **Cloudflare → DNS**: `CNAME @` and `CNAME www` → that target, **Proxied**
   (orange cloud).
4. **Cloudflare → SSL/TLS → Overview → Full (strict)**. Railway serves a valid
   cert; *Flexible* causes a redirect loop.
5. **Cloudflare → WAF → Custom rules**: add a rule —
   *When* `URI Path equals /api/payhere/notify` *Then* **Skip** → Managed rules,
   Bot Fight Mode, Rate limiting. Otherwise Cloudflare can challenge PayHere's
   server-to-server POST and orders never flip to paid.
   (Optional: a Cache Rule to bypass cache on `/api/*` — the route is already
   `force-dynamic`.)
6. **PayHere** → Settings → Domains & Credentials → add `yourdomain.com`
   (no `https://`, no path). Wait for **Allowed**. Copy **that domain's**
   Merchant Secret.
7. **Railway → Variables**, then **redeploy**:
   ```
   NEXT_PUBLIC_SITE_URL              = https://yourdomain.com
   PAYHERE_MERCHANT_SECRET          = <the domain's secret>
   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = <stable 32-byte base64>
   PAYHERE_MODE                     = sandbox   # keep testing first
   ```
8. Verify a full sandbox payment on the live domain (real PayHere callback this
   time — no `fire-notify.mts` needed).
9. **Switch to live**: only after PayHere approves the domain on the **live**
   dashboard (`www.payhere.lk`), set `PAYHERE_MODE=live` and swap in the live
   Merchant ID + Secret. Redeploy.

`next.config.ts` derives the Server Action CSRF allow-list from
`NEXT_PUBLIC_SITE_URL`, so a future domain change is just steps 6–8 again — no
code edit.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Unauthorized payment request" on the PayHere page | Secret not for an approved domain / `NEXT_PUBLIC_SITE_URL` host ≠ approved domain / sandbox↔live mismatch | Run `scripts/payhere-smoke.mts`; align domain + secret + mode |
| Checkout page 500s with "PayHere checkout blocked… PAYHERE_MODE=live but … localhost" | Live mode with a localhost site URL | Set a real `NEXT_PUBLIC_SITE_URL` or keep `PAYHERE_MODE=sandbox` |
| Payment succeeds, order stuck on "Pending payment" (local) | PayHere can't reach `localhost` | `npx dotenv -e .env.local -- tsx scripts/fire-notify.mts SB-XXXXXX` |
| Payment succeeds, order stuck on "Pending payment" (prod) | Callback blocked by Cloudflare bot/WAF, or `notify_url` domain not approved | Add the WAF Skip rule (§5.5); confirm the domain is Allowed |
| `notify` logs "signature mismatch" | Wrong `PAYHERE_MERCHANT_SECRET`, or `amount`/`currency` formatting | Confirm secret matches the domain; amount is `toFixed(2)`, currency `LKR` |
| Server Action POST returns 403 behind proxy | Origin/Host mismatch | Ensure `NEXT_PUBLIC_SITE_URL` host = the domain the browser uses; it's in `allowedOrigins` via `next.config.ts` |
| Checkout Server Action fails intermittently after a deploy | Rotating Server Actions encryption key | Set a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` |
| Orders fall back to "pay on collection" unexpectedly | `PAYHERE_MERCHANT_ID` or `_SECRET` blank | `isPayHereConfigured()` needs both set |

Turn on `PAYHERE_DEBUG=1` and re-test to see the exact fields going out
(`[payhere] checkout fields` in the server logs — merchant id is masked, hash
truncated).

---

## 7. Future enhancement — reconcile on return

Today the order only becomes `paid` via the `notify` webhook. To also handle a
delayed/missed callback, add a server-side check on the return page
(`/order/[orderId]`):

- Get an OAuth token with the **App ID / App Secret** (Settings → API & Webhooks).
- Call the **Payment Retrieval API**
  (`GET https://sandbox.payhere.lk/merchant/v1/payment/search?order_id=...`).
- If PayHere reports success and the local order is still `pending_payment`, run
  the same `applyPaymentResult()` path (guarded so the webhook and this can't
  double-apply).

This also makes local browser testing update without `fire-notify.mts`. Needs
two new env vars (`PAYHERE_APP_ID`, `PAYHERE_APP_SECRET`) and a small
`src/lib/payhere-retrieve.ts`.

---

## 8. Reference

- Checkout API: <https://support.payhere.lk/api-&-mobile-sdk/payhere-checkout>
- Sandbox: <https://support.payhere.lk/api-&-mobile-sdk/sandbox-mode>
- Payment Retrieval API: <https://support.payhere.lk/api-&-mobile-sdk/retrieval-api>
- Sandbox dashboard: <https://sandbox.payhere.lk> · Live: <https://www.payhere.lk>
