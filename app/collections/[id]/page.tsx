"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCurrency } from "@/lib/currency-context";

interface PricedItem {
  id: number;
  card_id: number;
  card_name: string;
  set_name: string | null;
  card_image: string | null;
  quantity: number;
  cardResolved: boolean;
  euEur: number | null;
  tcgAmount: number | null;
  tcgFrom: "EUR" | "USD" | null;
}

interface Stats {
  itemRows: number;
  missingCard: number;
  missingPriceEu: number;
  missingPriceTcg: number;
}

export default function CollectionDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { format, ratesLoading } = useCurrency();

  const [collectionName, setCollectionName] = useState("");
  const [items, setItems] = useState<PricedItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [deletingCol, setDeletingCol] = useState(false);

  const load = useCallback(async () => {
    const id = rawId;
    if (!id) return;
    setRefreshing(true);
    const res = await fetch(`/api/collections/${id}`);
    const d = await res.json();
    setRefreshing(false);
    setLoading(false);
    if (!res.ok) {
      if (res.status === 404) router.replace("/collections");
      return;
    }
    setCollectionName(d.collection?.name ?? "");
    setItems(d.items ?? []);
    setStats(d.stats ?? null);
  }, [rawId, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/auth/signin?callbackUrl=/collections/${rawId}`);
    }
  }, [status, router, rawId]);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  const totals = useMemo(() => {
    let sumEu = 0;
    let linesEu = 0;
    let sumTcgEur = 0;
    let linesTcgEur = 0;
    let sumTcgUsd = 0;
    let linesTcgUsd = 0;
    for (const it of items) {
      const q = it.quantity;
      if (it.euEur != null) {
        sumEu += it.euEur * q;
        linesEu += 1;
      }
      if (it.tcgAmount != null && it.tcgFrom === "EUR") {
        sumTcgEur += it.tcgAmount * q;
        linesTcgEur += 1;
      }
      if (it.tcgAmount != null && it.tcgFrom === "USD") {
        sumTcgUsd += it.tcgAmount * q;
        linesTcgUsd += 1;
      }
    }
    return {
      cardmarket: linesEu > 0 ? format(sumEu, "EUR") : null,
      tcgEur: linesTcgEur > 0 ? format(sumTcgEur, "EUR") : null,
      tcgUsd: linesTcgUsd > 0 ? format(sumTcgUsd, "USD") : null,
      linesEu,
      linesTcgEur,
      linesTcgUsd,
    };
  }, [items, format]);

  async function removeCard(cardId: number) {
    if (!rawId) return;
    setRemoving(cardId);
    await fetch(`/api/collections/${rawId}/items?cardId=${cardId}`, { method: "DELETE" });
    setRemoving(null);
    await load();
  }

  async function deleteCollection() {
    if (!rawId || !confirm(`Delete “${collectionName}” and all of its cards?`)) return;
    setDeletingCol(true);
    const res = await fetch(`/api/collections/${rawId}`, { method: "DELETE" });
    setDeletingCol(false);
    if (res.ok) router.replace("/collections");
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-24" style={{ color: "var(--muted)" }}>
        <span className="inline-block w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const showWarning =
    stats &&
    (stats.missingCard > 0 || stats.missingPriceEu > 0 || stats.missingPriceTcg > 0) &&
    items.length > 0;

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href="/collections" className="text-sm mb-2 inline-block" style={{ color: "var(--muted)" }}>
            ← Collections
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold truncate">{collectionName || "Collection"}</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {items.length} line{items.length !== 1 ? "s" : ""} · values use lowest NM (Cardmarket) and listed price
            (TCGPlayer)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => load()}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh prices"}
          </button>
          <button
            type="button"
            className="btn-ghost text-sm"
            style={{ color: "var(--red)", borderColor: "var(--red)" }}
            onClick={deleteCollection}
            disabled={deletingCol}
          >
            {deletingCol ? "…" : "Delete collection"}
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div
          className="rounded-xl p-4 sm:p-5 flex flex-col gap-3"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest m-0" style={{ color: "var(--muted)" }}>
            Current reference total
          </h2>
          {ratesLoading ? (
            <p className="text-sm m-0" style={{ color: "var(--muted)" }}>
              Loading exchange rates…
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {totals.cardmarket && (
                <p className="text-sm m-0">
                  <span style={{ color: "var(--muted)" }}>Cardmarket (EU) sum · </span>
                  <span className="font-bold tabular-nums" style={{ color: "var(--eu-color)" }}>
                    {totals.cardmarket}
                  </span>
                </p>
              )}
              {totals.tcgEur && (
                <p className="text-sm m-0">
                  <span style={{ color: "var(--muted)" }}>TCGPlayer sum (EUR lines) · </span>
                  <span className="font-bold tabular-nums">{totals.tcgEur}</span>
                </p>
              )}
              {totals.tcgUsd && (
                <p className="text-sm m-0">
                  <span style={{ color: "var(--muted)" }}>TCGPlayer sum (USD lines) · </span>
                  <span className="font-bold tabular-nums" style={{ color: "var(--red)" }}>
                    {totals.tcgUsd}
                  </span>
                </p>
              )}
              {!totals.cardmarket && !totals.tcgEur && !totals.tcgUsd && (
                <p className="text-sm m-0" style={{ color: "var(--muted)" }}>
                  No price data on these printings yet.
                </p>
              )}
            </div>
          )}
          {showWarning && (
            <p className="text-xs m-0 pt-2 border-t" style={{ color: "var(--muted)", borderColor: "var(--border)" }}>
              Totals only include prices we have. Some rows are missing live card data, Cardmarket NM, or TCGPlayer listed
              price ({stats!.missingCard} unloadable, {stats!.missingPriceEu} no EU NM, {stats!.missingPriceTcg} no TCG line).
            </p>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div
          className="rounded-xl py-16 text-center px-4"
          style={{ border: "2px dashed var(--border)", color: "var(--muted)" }}
        >
          <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>
            This collection is empty
          </p>
          <p className="text-sm mb-4">Open any card and use “Add to collection”.</p>
          <Link href="/" className="btn-primary text-sm">
            Search cards
          </Link>
        </div>
      ) : (
        <div className="watchlist-grid">
          {items.map((item) => (
            <div key={item.id} className="card-surface flex flex-col overflow-hidden min-w-0">
              <Link
                href={`/cards/${item.card_id}`}
                className="relative w-full flex items-center justify-center"
                style={{ background: "var(--surface-raised)", aspectRatio: "5/7" }}
              >
                {item.card_image ? (
                  <Image
                    src={item.card_image}
                    alt={item.card_name}
                    fill
                    sizes="(max-width: 639px) 45vw, 200px"
                    className="object-contain p-2"
                    loading="lazy"
                    quality={85}
                  />
                ) : (
                  <div className="text-4xl font-black" style={{ color: "var(--border)" }}>
                    ?
                  </div>
                )}
              </Link>
              <div className="p-3 flex flex-col gap-2 flex-1">
                <div>
                  <p className="font-semibold text-sm leading-tight">
                    {item.card_name}
                    {item.quantity > 1 && (
                      <span className="text-xs font-normal" style={{ color: "var(--muted)" }}>
                        {" "}
                        ×{item.quantity}
                      </span>
                    )}
                  </p>
                  {item.set_name && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {item.set_name}
                    </p>
                  )}
                </div>
                <div className="text-xs flex flex-col gap-1" style={{ color: "var(--muted)" }}>
                  {!item.cardResolved && <span>Card data unavailable</span>}
                  {item.euEur != null && (
                    <span>
                      Cardmarket (EU):{" "}
                      <strong style={{ color: "var(--eu-color)" }}>{format(item.euEur * item.quantity, "EUR")}</strong>
                      {item.quantity > 1 && (
                        <span>
                          {" "}
                          ({format(item.euEur, "EUR")} each)
                        </span>
                      )}
                    </span>
                  )}
                  {item.euEur == null && item.cardResolved && <span>No Cardmarket NM</span>}
                  {item.tcgAmount != null && item.tcgFrom && (
                    <span>
                      TCGPlayer:{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {format(item.tcgAmount * item.quantity, item.tcgFrom)}
                      </strong>
                      {item.quantity > 1 && (
                        <span>
                          {" "}
                          ({format(item.tcgAmount, item.tcgFrom)} each)
                        </span>
                      )}
                    </span>
                  )}
                  {item.tcgAmount == null && item.cardResolved && <span>No TCGPlayer listed price</span>}
                </div>
                <div className="mt-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => removeCard(item.card_id)}
                    disabled={removing === item.card_id}
                    className="btn-ghost text-xs flex-1"
                    style={{ color: "var(--red)", borderColor: "var(--red)" }}
                  >
                    {removing === item.card_id ? "…" : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
