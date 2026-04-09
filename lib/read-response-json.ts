/** Parse fetch Response JSON; avoids opaque "Unexpected end of JSON input" on empty bodies. */
export async function readResponseJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      `Empty server response (HTTP ${res.status}). If you were uploading, try smaller photos, confirm BLOB_READ_WRITE_TOKEN is set, or check for a timeout.`
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const snippet = trimmed.slice(0, 160).replace(/\s+/g, " ");
    throw new Error(
      `Invalid response from server (HTTP ${res.status}): ${snippet}${trimmed.length > 160 ? "…" : ""}`
    );
  }
}
