import { NextResponse } from "next/server";
import { TCGGO_BASE, tcgHeaders } from "@/lib/tcggo";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const res = await fetch(`${TCGGO_BASE}/cards/${id}`, {
    headers: tcgHeaders(),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Card not found." }, { status: res.status });
  }

  const json = await res.json();
  // API wraps the card in { data: { ... } }
  const card = json?.data ?? json;

  return NextResponse.json(card);
}
