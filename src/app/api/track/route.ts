import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteVisits } from "@/db/schema";
import { trackSchema } from "@/lib/validation";

export const runtime = "nodejs";
// Never cached or prerendered — every call is a write.
export const dynamic = "force-dynamic";

/** Store only the referring host, never the full referring URL. */
function referrerHost(raw: string | undefined, selfHost: string | null): string | null {
  if (!raw) return null;
  try {
    const host = new URL(raw).host;
    return host && host !== selfHost ? host.slice(0, 200) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const d = parsed.data;

  // Storefront traffic only — the dashboard is not part of the funnel.
  if (d.path.startsWith("/admin") || d.path.startsWith("/api")) {
    return NextResponse.json({ ok: true });
  }

  try {
    const db = getDb();
    await db.insert(siteVisits).values({
      visitorId: d.visitorId,
      sessionId: d.sessionId,
      path: d.path.slice(0, 300),
      referrerHost: referrerHost(d.referrer || undefined, request.headers.get("host")),
    });
  } catch (err) {
    // A failed analytics write is not worth surfacing to the visitor.
    console.error("visit tracking failed", err);
  }

  return NextResponse.json({ ok: true });
}
