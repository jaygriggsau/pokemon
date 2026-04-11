"use client";

import Link from "next/link";
import { useCurrency } from "@/lib/currency-context";
import type { TcgCard } from "@/lib/tcggo";

/** Reference prices from Cardmarket (EU) and TCGPlayer (US), same sources as search results. */
export function MarketPriceGuide({ card }: { card: TcgCard }) {
  const { format } = useCurrency();
  const cm = card.prices?.cardmarket;
  const tcg = card.prices?.tcg_player;
  const hasEu = cm?.lowest_near_mint != null;
  const hasUs = tcg?.market_price != null;
  const tcgSourceCur: "EUR" | "USD" =
    tcg?.currency?.toUpperCase() === "USD" ? "USD" : "EUR";

  if (!hasEu && !hasUs) {
    return (
      <div
        className="rounded-xl px-3 py-2.5"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
          Reference prices
        </p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          No guide prices for this printing yet. Check the{" "}
          <Link href={`/cards/${card.id}`} className="underline" style={{ color: "var(--text)" }}>
            card detail page
          </Link>{" "}
          or set a price from your own research.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        Reference prices
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hasEu && (
          <div className="min-w-0">
            <span className="text-xs block mb-0.5" style={{ color: "var(--muted)" }}>
              Cardmarket (EU)
            </span>
            <span className="text-base font-bold tabular-nums" style={{ color: "var(--eu-color)" }}>
              {format(cm!.lowest_near_mint!, "EUR")}
            </span>
            <span className="text-xs block mt-0.5" style={{ color: "var(--muted)" }}>
              Lowest NM
            </span>
          </div>
        )}
        {hasUs && (
          <div className="min-w-0">
            <span className="text-xs block mb-0.5" style={{ color: "var(--muted)" }}>
              TCGPlayer (US)
            </span>
            <span className="text-base font-bold tabular-nums" style={{ color: "var(--red)" }}>
              {format(tcg!.market_price!, tcgSourceCur)}
            </span>
            <span className="text-xs block mt-0.5" style={{ color: "var(--muted)" }}>
              Listed
            </span>
          </div>
        )}
      </div>
      <p className="text-xs pt-1 border-t" style={{ color: "var(--muted)", borderColor: "var(--border)" }}>
        Reference only — not a buy or sell offer.
      </p>
    </div>
  );
}
