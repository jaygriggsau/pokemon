"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { TcgCard } from "@/lib/tcggo";

type Row = { id: number; name: string };

export function AddToCollection({ card }: { card: TcgCard }) {
  const { data: session } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [sel, setSel] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/collections")
      .then((r) => r.json())
      .then((d) => setRows(d.collections ?? []));
  }, [session]);

  if (!session) {
    const cb = encodeURIComponent(`/cards/${card.id}`);
    return (
      <Link
        href={`/auth/signin?callbackUrl=${cb}`}
        className="btn-ghost w-full text-center"
        style={{ fontSize: "0.8125rem" }}
      >
        Sign in for collections
      </Link>
    );
  }

  async function add() {
    if (!sel) {
      setHint("Choose a collection first.");
      return;
    }
    setBusy(true);
    setHint(null);
    const res = await fetch(`/api/collections/${sel}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId: card.id,
        cardName: card.name,
        cardImage: card.image ?? null,
        setName: card.episode?.name ?? null,
        quantity: 1,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setHint(typeof d.error === "string" ? d.error : "Could not add card.");
      return;
    }
    setHint("Added. Open the collection to see the updated total.");
    setTimeout(() => setHint(null), 4000);
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          className="input-field flex-1 text-sm min-h-11"
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          aria-label="Collection"
        >
          <option value="">Add to collection…</option>
          {rows.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn-primary text-sm shrink-0 min-h-11" disabled={busy || !sel} onClick={add}>
          {busy ? "…" : "Add"}
        </button>
      </div>
      {rows.length === 0 && (
        <p className="text-xs m-0" style={{ color: "var(--muted)" }}>
          No collections yet —{" "}
          <Link href="/collections" className="underline" style={{ color: "var(--eu-color)" }}>
            create one
          </Link>
        </p>
      )}
      {hint && (
        <p
          className="text-xs m-0"
          style={{ color: hint.startsWith("Added") ? "var(--eu-color)" : "var(--red)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
