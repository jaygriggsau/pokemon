import { put } from "@vercel/blob";
import { isVercelBlobPublicUrl } from "./blob-host";

const MAX_CATALOG_IMAGE_BYTES = 2_500_000;

export { isVercelBlobPublicUrl } from "./blob-host";

/** Only mirror catalog art from known TCG sources (avoid open SSRF). */
export function isAllowedExternalCatalogImageUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  if (h === "tcggo.com" || h.endsWith(".tcggo.com")) return true;
  if (h === "images.pokemontcg.io") return true;
  return false;
}

/**
 * Copy a remote catalog image to Vercel Blob so marketplace listings only store blob URLs.
 * If the URL is already on Blob, returns it unchanged.
 */
export async function mirrorCatalogImageToBlob(opts: {
  sourceUrl: string;
  pathnamePrefix: string;
}): Promise<{ url: string } | { error: string }> {
  const trimmed = opts.sourceUrl.trim();
  if (!trimmed) return { error: "Missing image URL" };

  if (isVercelBlobPublicUrl(trimmed)) {
    return { url: trimmed };
  }

  if (!isAllowedExternalCatalogImageUrl(trimmed)) {
    return { error: "Catalog image URL is not from an allowed host" };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return { error: "BLOB_READ_WRITE_TOKEN is not configured" };
  }

  let res: Response;
  try {
    res = await fetch(trimmed);
  } catch {
    return { error: "Could not download catalog image" };
  }
  if (!res.ok) {
    return { error: "Catalog image download failed" };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 32) return { error: "Image too small" };
  if (buf.length > MAX_CATALOG_IMAGE_BYTES) return { error: "Catalog image too large" };

  const ct = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  if (!ct.startsWith("image/")) {
    return { error: "URL did not return an image" };
  }

  const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
  const path = `${opts.pathnamePrefix}/catalog-${Date.now()}.${ext}`;

  try {
    const uploaded = await put(path, buf, {
      access: "public",
      contentType: ct,
      addRandomSuffix: true,
    });
    return { url: uploaded.url };
  } catch {
    return { error: "Could not upload catalog image to storage" };
  }
}
