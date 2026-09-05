/**
 * Create (or update) a dashboard admin user.
 *
 *   Local:  npm run admin:create -- owner@example.lk 'the-password'
 *   Prod:   (Railway shell)  npm run admin:create:prod -- owner@example.lk 'the-password'
 *
 * With no args it falls back to ADMIN_EMAIL / ADMIN_PASSWORD from the environment.
 * Upserts by email, so re-running it just resets that user's password.
 */
import { getDb } from "../src/db/index.ts";
import { adminUsers } from "../src/db/schema.ts";
import { hashPassword } from "../src/lib/password.ts";

const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.argv[3] ?? process.env.ADMIN_PASSWORD ?? "";

if (!email || !password) {
  console.error("Usage: npm run admin:create -- <email> <password>");
  console.error("   or: set ADMIN_EMAIL / ADMIN_PASSWORD and run with no args");
  process.exit(1);
}
if (password.length < 8) {
  console.error("! Password must be at least 8 characters.");
  process.exit(1);
}

const db = getDb();

const [row] = await db
  .insert(adminUsers)
  .values({ email, passwordHash: hashPassword(password) })
  .onConflictDoUpdate({
    target: adminUsers.email,
    set: { passwordHash: hashPassword(password) },
  })
  .returning({ id: adminUsers.id, email: adminUsers.email, createdAt: adminUsers.createdAt });

console.log(`✔ Admin ready: ${row.email}  (id ${row.id})`);
process.exit(0);
