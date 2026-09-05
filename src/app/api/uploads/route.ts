import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import {
  MAX_FILES_PER_REQUEST,
  MAX_UPLOAD_BYTES,
  extensionFor,
  sniffExtension,
  uploadDir,
} from "@/lib/uploads";

export const runtime = "nodejs";

const TYPE_HELP = "Use a JPG, PNG, WebP, AVIF or GIF image.";

/**
 * Stores one or more product images. Send them as `file` (single) or repeated
 * `files` entries (gallery). Responds with `{ url, urls }` — `url` is the
 * first upload so single-file callers can keep reading one field.
 */
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const files = [...form.getAll("files"), ...form.getAll("file")].filter(
    (f): f is File => f instanceof File && f.size > 0,
  );

  if (files.length === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Upload at most ${MAX_FILES_PER_REQUEST} images at a time.` },
      { status: 400 },
    );
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    const claimed = extensionFor(file);
    if (!claimed) {
      return NextResponse.json(
        { error: `“${file.name}” is not a supported image. ${TYPE_HELP}` },
        { status: 415 },
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `“${file.name}” is larger than 5 MB.` },
        { status: 413 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    // Trust the bytes over the extension — a mislabelled JPG is fine, a
    // non-image pretending to be one is not.
    const actual = sniffExtension(bytes);
    if (!actual) {
      return NextResponse.json(
        { error: `“${file.name}” does not look like an image file. ${TYPE_HELP}` },
        { status: 415 },
      );
    }

    const name = `${randomUUID()}.${actual}`;
    await writeFile(path.join(/* turbopackIgnore: true */ dir, name), bytes);
    urls.push(`/api/uploads/${name}`);
  }

  return NextResponse.json({ url: urls[0], urls });
}
