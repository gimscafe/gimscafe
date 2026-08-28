import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { EXT_MIME, uploadDir } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;
  const rel = segments.join("/");

  // Only allow a single safe filename inside UPLOAD_DIR.
  if (
    segments.length !== 1 ||
    rel.includes("..") ||
    rel.includes("/") ||
    rel.includes("\\") ||
    !/^[A-Za-z0-9._-]+$/.test(rel)
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(/* turbopackIgnore: true */ uploadDir(), rel);
  const ext = path.extname(rel).slice(1).toLowerCase();
  const contentType = EXT_MIME[ext];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
