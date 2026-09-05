/**
 * Upload constants shared by the browser and the server. Kept apart from
 * `lib/uploads.ts`, which is `server-only` and touches `node:fs`/`node:path`.
 */

/** What the file picker offers and what the server accepts. */
export const ACCEPT_ATTR =
  ".jpg,.jpeg,.png,.webp,.avif,.gif,image/jpeg,image/png,image/webp,image/avif,image/gif";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 8;
export const MAX_GALLERY_IMAGES = 8;
