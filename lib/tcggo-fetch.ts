import { TCGGO_BASE, tcgHeaders, type TcgCard } from "@/lib/tcggo";

/** Fresh card payload for pricing (bypasses short CDN cache on list endpoints). */
export async function fetchTcgCardById(id: number): Promise<TcgCard | null> {
  const res = await fetch(`${TCGGO_BASE}/cards/${id}`, {
    headers: tcgHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  const row = json && typeof json === "object" && "data" in json ? (json as { data: unknown }).data : json;
  if (!row || typeof row !== "object" || !("id" in row)) return null;
  const card = row as TcgCard;
  return typeof card.id === "number" ? card : null;
}
