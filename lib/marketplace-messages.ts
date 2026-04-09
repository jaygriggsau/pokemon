export const MAX_MESSAGE_CHARS = 4000;

export function normalizeMessageBody(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.length > MAX_MESSAGE_CHARS) return null;
  return s;
}
