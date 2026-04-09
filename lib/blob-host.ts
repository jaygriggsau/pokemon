/** Public Vercel Blob URLs (*.public.blob.vercel-storage.com). */
export function isVercelBlobPublicUrl(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return host.endsWith(".public.blob.vercel-storage.com") || host === "public.blob.vercel-storage.com";
  } catch {
    return false;
  }
}
