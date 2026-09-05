import "server-only";
import path from "node:path";

/** Directory where uploaded product images are stored (Railway: mount a volume). */
export function uploadDir(): string {
  const configured = process.env.UPLOAD_DIR;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(/* turbopackIgnore: true */ process.cwd(), configured);
  }
  return path.join(/* turbopackIgnore: true */ process.cwd(), "uploads");
}

export const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

export {
  ACCEPT_ATTR,
  MAX_FILES_PER_REQUEST,
  MAX_GALLERY_IMAGES,
  MAX_UPLOAD_BYTES,
} from "./uploads-shared";

/**
 * Resolve the stored extension for an upload. Browsers occasionally send an
 * empty or generic `type` (notably for drag-and-drop and some Android
 * pickers), so fall back to the filename extension before rejecting.
 */
export function extensionFor(file: File): string | null {
  const byMime = MIME_EXT[file.type.toLowerCase()];
  if (byMime) return byMime;

  const ext = path.extname(file.name).slice(1).toLowerCase();
  const normalized = ext === "jpeg" ? "jpg" : ext;
  return EXT_MIME[normalized] ? normalized : null;
}

/**
 * Confirm the bytes really are the image the extension claims. Stops a
 * renamed .exe (or an SVG carrying script) from landing in the upload dir and
 * later being served back with an image content-type.
 */
export function sniffExtension(bytes: Uint8Array): string | null {
  const at = (i: number) => bytes[i];
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "jpg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 &&
    at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a
  ) {
    return "png";
  }
  // GIF87a / GIF89a
  if (at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46) return "gif";

  // RIFF....WEBP  and  ....ftypavif  both live in the first 12 bytes
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && ascii(8, 12).startsWith("avi")) return "avif";

  return null;
}
