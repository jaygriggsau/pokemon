import { NextResponse } from "next/server";
import {
  TCGGO_BASE,
  tcgHeaders,
  filterCardsBySearchRelevance,
  type SearchResponse,
  type TcgCard,
} from "@/lib/tcggo";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const sort = searchParams.get("sort") ?? "price_highest";
  const relaxed = searchParams.get("relaxed") === "1";

  if (!q) {
    return NextResponse.json({ cards: [] });
  }

  const url = `${TCGGO_BASE}/cards?search=${encodeURIComponent(q)}&sort=${sort}`;

  const res = await fetch(url, {
    headers: tcgHeaders(),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("TCGGO error:", res.status, text);
    return NextResponse.json(
      { error: "Failed to fetch cards from TCGGO API." },
      { status: res.status }
    );
  }

  const data: SearchResponse = await res.json();
  let cards: TcgCard[] = data.data ?? data.cards ?? data.results ?? [];

  if (!relaxed) {
    cards = filterCardsBySearchRelevance(cards, q);
  }

  return NextResponse.json({ cards });
}
