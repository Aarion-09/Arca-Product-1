// Image uploads.
//
// Files are written to disk and the database stores only a path. Images are
// validated by their actual file signature — not the MIME type the client
// claims — size-capped well below Hostinger's proxy limit, and served from a
// dedicated directory that robots.txt excludes.

import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, basename } from "node:path";
import { randomBytes } from "node:crypto";
import { UPLOAD } from "./config.mjs";
import { badRequest, httpError } from "./security.mjs";

const SIGNATURES = [
  {
    mime: "image/png",
    ext: "png",
    test: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  {
    mime: "image/jpeg",
    ext: "jpg",
    test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) =>
      b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
];

let ready = false;
async function ensureDir() {
  if (ready) return;
  await mkdir(UPLOAD.dir, { recursive: true });
  ready = true;
}

/**
 * Accepts a data: URI from the client, verifies it really is one of the image
 * types we allow, writes it to disk and returns a public path.
 */
export async function saveImage(dataUri, { maxBytes = UPLOAD.maxImageBytes, prefix = "img" } = {}) {
  const text = String(dataUri || "");
  if (!text) return "";

  // Already a stored path — the client is re-submitting an unchanged profile.
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(text)) return text;

  const match = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/\r\n]*={0,2})$/i.exec(text);
  if (!match) throw badRequest("That image could not be read. Use a PNG, JPEG or WebP file.");

  const declared = match[1].toLowerCase();
  if (!UPLOAD.imageTypes.has(declared)) throw badRequest("Images must be PNG, JPEG or WebP.");

  const base64 = match[2].replace(/[\r\n]/g, "");
  // 4 base64 characters encode 3 bytes; reject before allocating the buffer.
  if (base64.length / 4 * 3 > maxBytes) {
    throw httpError(413, `That image is too large. The limit is ${Math.round(maxBytes / 1_000_000)}MB.`);
  }

  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length) throw badRequest("That image could not be read.");
  if (bytes.length > maxBytes) {
    throw httpError(413, `That image is too large. The limit is ${Math.round(maxBytes / 1_000_000)}MB.`);
  }

  const signature = SIGNATURES.find((s) => s.test(bytes));
  if (!signature) throw badRequest("That file is not a valid image.");
  if (signature.mime !== declared) {
    throw badRequest("The file contents do not match its image type.");
  }

  await ensureDir();
  const name = `${prefix}-${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${signature.ext}`;
  await writeFile(join(UPLOAD.dir, name), bytes);
  return `/uploads/${name}`;
}

/** Removes a previously stored upload. Never throws — cleanup is best effort. */
export async function removeImage(path) {
  if (!path || !/^\/uploads\/[A-Za-z0-9._-]+$/.test(path)) return;
  try {
    await unlink(join(UPLOAD.dir, basename(path)));
  } catch {
    /* already gone */
  }
}
