/**
 * PayHere handshake smoke test — no DB, no Next.js server needed.
 *
 * Reads PAYHERE_* + NEXT_PUBLIC_SITE_URL from .env.local, builds the same
 * checkout form the app sends, POSTs it to the PayHere checkout endpoint, and
 * reports whether PayHere accepts it or answers "Unauthorized payment request".
 *
 *   npx tsx scripts/payhere-smoke.mts
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env: Record<string, string> = {};
for (const line of envText.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  let v = t.slice(eq + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  env[t.slice(0, eq).trim()] = v;
}

const merchantId = (env.PAYHERE_MERCHANT_ID ?? "").trim();
const merchantSecret = (env.PAYHERE_MERCHANT_SECRET ?? "").trim();
const mode = (env.PAYHERE_MODE ?? "sandbox").trim();
const base = (env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100").replace(/\/$/, "");

if (!merchantId || !merchantSecret) {
  console.error(
    "✗ PAYHERE_MERCHANT_ID / PAYHERE_MERCHANT_SECRET are empty in .env.local.\n" +
      "  Fill in your sandbox credentials from sandbox.payhere.lk and re-run.",
  );
  process.exit(1);
}

const md5Upper = (s: string) =>
  createHash("md5").update(s).digest("hex").toUpperCase();

const orderId = "SB-SMOKE1";
const currency = "LKR";
const amount = (2500).toFixed(2); // LKR 2,500.00
const hash = md5Upper(
  merchantId + orderId + amount + currency + md5Upper(merchantSecret),
);

const fields: Record<string, string> = {
  merchant_id: merchantId,
  return_url: `${base}/order/smoke`,
  cancel_url: `${base}/order/smoke?cancelled=1`,
  notify_url: `${base}/api/payhere/notify`,
  order_id: orderId,
  items: "Smoke test cake",
  currency,
  amount,
  first_name: "Test",
  last_name: "Buyer",
  email: "test@example.com",
  phone: "0770000000",
  address: "27 Horton Place",
  city: "Colombo",
  country: "Sri Lanka",
  hash,
};

const checkoutUrl =
  mode === "live"
    ? "https://www.payhere.lk/pay/checkout"
    : "https://sandbox.payhere.lk/pay/checkout";

console.log("→ POST", checkoutUrl);
console.log("  merchant_id :", merchantId, "(len", merchantId.length + ")");
console.log("  mode        :", mode);
console.log("  origin      :", base);
console.log("  order_id     :", orderId, " amount:", amount, currency);
console.log("  hash        :", hash);
console.log();

const res = await fetch(checkoutUrl, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(fields).toString(),
  redirect: "manual",
});

const body = await res.text();
const location = res.headers.get("location");
console.log("← HTTP", res.status, res.statusText);
if (location) console.log("  Location:", location);

if (/unauthorized payment request/i.test(body)) {
  console.log(
    '\n✗ PayHere answered "Unauthorized payment request".\n' +
      "  The merchant_id / merchant_secret pair is not valid for this endpoint,\n" +
      "  or the secret is not tied to an approved domain/app on the account.\n" +
      "  Fix: in sandbox.payhere.lk → Domains & Credentials, open the app whose\n" +
      "  domain covers this origin and copy THAT app's Merchant Secret.",
  );
  process.exit(2);
}

if (
  res.status === 302 ||
  /card\s*number|cardholder|Visa|MasterCard|cvv|expiry|payhere-checkout|Pay\s*Now/i.test(
    body,
  )
) {
  console.log(
    "\n✓ PayHere accepted the request and returned the payment page.\n" +
      "  The hash and credentials are correct. The earlier failure on Railway\n" +
      "  was purely the unapproved *.up.railway.app domain.",
  );
  process.exit(0);
}

console.log("\n? Unrecognized response. First 800 chars:\n");
console.log(body.slice(0, 800));
process.exit(3);
