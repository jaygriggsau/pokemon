/** Public site origin for canonical URLs and Open Graph (no trailing slash). */
export function getSiteUrl(): string {
  const fromAuth = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (fromAuth) return fromAuth;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

export function getMetadataBase(): URL {
  try {
    return new URL(getSiteUrl());
  } catch {
    return new URL("http://localhost:3000");
  }
}
