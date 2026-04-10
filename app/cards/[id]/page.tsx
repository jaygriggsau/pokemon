"use client";

import { useEffect, useState, Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCurrency } from "@/lib/currency-context";
import { PriceChart } from "@/components/PriceChart";
import { buildPriceHistory, artistName, type TcgCard, type GradedPrices } from "@/lib/tcggo";
import { formatMonthYear } from "@/lib/format-date";

// ── Type colour map ────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  fire: "#e25822", water: "#257cfd", grass: "#3fad48", lightning: "#f8c300",
  psychic: "#a65ead", fighting: "#cc7200", darkness: "#513f78", metal: "#8c8f8f",
  dragon: "#4363c8", fairy: "#d685ad", colorless: "#9ca3af", normal: "#9ca3af",
};
function typeColor(t: string) { return TYPE_COLORS[t.toLowerCase()] ?? "#8888a0"; }

function TypePip({ type }: { type: string }) {
  return (
    <span
      title={type}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 20, height: 20, borderRadius: "50%",
        background: typeColor(type), color: "white",
        fontSize: "0.6rem", fontWeight: 800, flexShrink: 0,
      }}
    >
      {type[0].toUpperCase()}
    </span>
  );
}

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const { format } = useCurrency();

  const [card, setCard] = useState<TcgCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watched, setWatched] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/cards/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCard(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!session || !card) return;
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((d) => setWatched((d.items ?? []).some((i: { card_id: number }) => i.card_id === card.id)));
  }, [session, card]);

  async function toggleWatchlist() {
    if (!session || !card) return;
    setWatchLoading(true);
    try {
      if (watched) {
        await fetch("/api/watchlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId: card.id }) });
        setWatched(false);
      } else {
        await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId: card.id, cardName: card.name, cardImage: card.image, setName: card.episode?.name }) });
        setWatched(true);
      }
    } finally { setWatchLoading(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32" style={{ color: "var(--muted)" }}>
      <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
    </div>
  );

  if (error || !card) return (
    <div className="text-center py-24 flex flex-col items-center gap-4">
      <p className="text-lg font-semibold">Card not found</p>
      <p className="text-sm" style={{ color: "var(--muted)" }}>{error ?? "This card could not be loaded."}</p>
      <button onClick={() => router.back()} className="btn-primary">← Go back</button>
    </div>
  );

  const cm  = card.prices?.cardmarket;
  const tcg = card.prices?.tcg_player;
  const chartData   = buildPriceHistory(card);
  const isSynthetic = !cm?.history || cm.history.length <= 1;

  const supertype = card.supertype?.replace(/[^\x00-\x7F]/g, "") || "";

  return (
    <div className="flex flex-col gap-10">

      {/* ── Back ── */}
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm w-fit min-h-11 min-w-11 -ml-2 px-2 rounded-lg transition-colors touch-manipulation"
        style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      {/* ── Hero: stack on phone, side-by-side from md ── */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] gap-6 md:gap-8 items-start">

        {/* Left: image + actions */}
        <div className="flex flex-col gap-3 w-full max-w-[280px] mx-auto md:max-w-none md:mx-0">
          <div className="relative rounded-2xl overflow-hidden w-full"
            style={{ aspectRatio: "5/7", background: "var(--surface)", border: "1px solid var(--border)" }}>
            {card.image ? (
              <Image src={card.image} alt={card.name} fill sizes="(max-width: 640px) 80vw, 280px"
                className="object-contain p-3" quality={90} priority />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl font-black" style={{ color: "var(--border)" }}>?</div>
            )}
          </div>

          {/* Watch */}
          {session ? (
            <button onClick={toggleWatchlist} disabled={watchLoading}
              className={watched ? "btn-primary w-full" : "btn-ghost w-full"}>
              {watchLoading
                ? <span className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                : watched ? "★ Watching" : "☆ Add to Watchlist"}
            </button>
          ) : (
            <Link href="/auth/signin" className="btn-ghost w-full text-center" style={{ fontSize: "0.8125rem" }}>Sign in to watch</Link>
          )}

          <div className="flex flex-col gap-1.5 pt-1">
            <Link
              href={`/marketplace?cardId=${card.id}`}
              className="btn-ghost w-full text-center"
              style={{ fontSize: "0.8125rem", borderColor: "var(--eu-color)", color: "var(--eu-color)" }}
            >
              Community marketplace — this card
            </Link>
            <Link
              href={`/marketplace/sell?cardId=${card.id}`}
              className="btn-ghost w-full text-center"
              style={{ fontSize: "0.75rem" }}
            >
              Sell this card (list with photos)
            </Link>
          </div>
        </div>

        {/* Right: all card metadata */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Title row */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {supertype && <Tag>{supertype}</Tag>}
              {card.rarity && <Tag accent>{card.rarity}</Tag>}
              {card.episode?.series?.name && <Tag dim>{card.episode.series.name}</Tag>}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">{card.name}</h1>
            {card.name_numbered && card.name_numbered !== card.name && (
              <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{card.name_numbered}</p>
            )}
          </div>

          {/* Stats strip */}
          {(card.hp || card.type) && (
            <div className="flex flex-wrap gap-3">
              {card.hp != null && (
                <StatChip label="HP" value={String(card.hp)} />
              )}
              {card.card_number != null && (
                <StatChip label="Card #" value={String(card.card_number)} />
              )}
            </div>
          )}

          {/* Metadata table */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-y-2 gap-x-6">
            {[
              { label: "Set",       value: card.episode?.name },
              { label: "Code",      value: card.episode?.code },
              { label: "Series",    value: card.episode?.series?.name },
              { label: "Released",  value: card.episode?.released_at ? formatMonthYear(card.episode.released_at) : undefined },
              { label: "Cards",     value: card.episode?.cards_total ? `${card.episode.cards_printed_total ?? card.episode.cards_total} / ${card.episode.cards_total} total` : undefined },
              { label: "Artist",    value: artistName(card.artist) },
              { label: "Reg. Mark", value: (card as unknown as { regulation_mark?: string }).regulation_mark },
            ].filter(r => r.value).map(({ label, value }) => (
              <Fragment key={label}>
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)", paddingTop: "0.1rem" }}>{label}</span>
                <span className="text-sm" style={{ color: "var(--text)" }}>{value}</span>
              </Fragment>
            ))}
          </div>

          {/* Flavor text */}
          {card.flavor_text && (
            <p className="text-sm italic leading-relaxed" style={{ color: "var(--muted)", borderLeft: "2px solid var(--border)", paddingLeft: "0.875rem" }}>
              {card.flavor_text}
            </p>
          )}

          {/* Current prices */}
          {(cm?.lowest_near_mint != null || tcg?.market_price != null) && (
            <div className="flex flex-col gap-3">
              <SectionLabel>Current Prices</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cm?.lowest_near_mint != null && (
                  <MarketCard
                    market="Cardmarket" region="EU Market" accentColor="var(--eu-color)"
                    rows={[
                      { label: "Near Mint",  value: format(cm.lowest_near_mint,   "EUR"), highlight: true },
                      cm["7d_average"]  != null && { label: "7d avg",   value: format(cm["7d_average"]!,  "EUR") },
                      cm["30d_average"] != null && { label: "30d avg",  value: format(cm["30d_average"]!, "EUR") },
                    ].filter(Boolean) as { label: string; value: string; highlight?: boolean }[]}
                  />
                )}
                {tcg?.market_price != null && (
                  <MarketCard
                    market="TCGPlayer" region="US Market" accentColor="var(--red)"
                    rows={[
                      { label: "Market",  value: format(tcg.market_price, tcg.currency as "EUR" | "USD" ?? "USD"), highlight: true },
                      tcg.mid_price != null && { label: "Mid",  value: format(tcg.mid_price, tcg.currency as "EUR" | "USD" ?? "USD") },
                    ].filter(Boolean) as { label: string; value: string; highlight?: boolean }[]}
                  />
                )}
              </div>
            </div>
          )}

          {/* Graded prices */}
          {cm?.graded && <GradedSection graded={cm.graded} formatFn={(v) => format(v, "EUR")} />}
        </div>
      </div>

      {/* ── Price History ── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold">Price History</h2>
          {isSynthetic && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--surface-raised)", color: "var(--muted)", border: "1px solid var(--border)" }}>
              averages only
            </span>
          )}
        </div>
        <div className="rounded-xl p-2 sm:p-4 min-w-0 overflow-x-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <PriceChart data={chartData as { date: string; eu?: number; us?: number }[]} isSynthetic={isSynthetic} />
        </div>
      </section>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Tag({ children, accent, dim }: { children: React.ReactNode; accent?: boolean; dim?: boolean }) {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
      background: accent ? "rgba(230,57,70,0.15)" : dim ? "var(--surface-raised)" : "rgba(74,158,255,0.12)",
      color: accent ? "var(--red)" : dim ? "var(--muted)" : "var(--eu-color)",
      border: `1px solid ${accent ? "rgba(230,57,70,0.3)" : dim ? "var(--border)" : "rgba(74,158,255,0.2)"}`,
    }}>
      {children}
    </span>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5 px-3 py-1.5 rounded-lg"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
      {children}
    </h2>
  );
}

function MarketCard({ market, region, accentColor, rows }: {
  market: string; region: string; accentColor: string;
  rows: { label: string; value: string; highlight?: boolean }[];
}) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2.5 min-w-0"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderTop: `2px solid ${accentColor}` }}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ background: accentColor, color: "white", fontSize: "0.6rem", letterSpacing: "0.05em" }}>
          {region}
        </span>
        <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{market}</span>
      </div>
      {rows.map(({ label, value, highlight }) => (
        <div key={label} className="flex justify-between items-baseline gap-2 min-w-0">
          <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>{label}</span>
          <span
            className="font-bold min-w-0 flex-1 text-end"
            style={{
              color: highlight ? "var(--text)" : "var(--muted)",
              fontSize: highlight ? "clamp(0.85rem, 2.5vw, 1.05rem)" : "0.8rem",
              lineHeight: 1.25,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function GradedSection({ graded, formatFn }: { graded: GradedPrices; formatFn: (v: number) => string }) {
  const badges = [
    { label: "PSA 10",  value: graded.psa?.psa10 },
    { label: "PSA 9",   value: graded.psa?.psa9  },
    { label: "PSA 8",   value: graded.psa?.psa8  },
    { label: "BGS 10",  value: graded.bgs?.bgs10 },
    { label: "BGS 9",   value: graded.bgs?.bgs9  },
    { label: "BGS 8",   value: graded.bgs?.bgs8  },
    { label: "CGC 10",  value: graded.cgc?.cgc10 },
    { label: "CGC 9",   value: graded.cgc?.cgc9  },
    { label: "CGC 8",   value: graded.cgc?.cgc8  },
  ].filter((b) => b.value != null) as { label: string; value: number }[];

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>Graded Prices</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {badges.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-0 max-w-full"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", minWidth: 72 }}>
            <span className="text-xs font-bold" style={{ color: "var(--yellow)" }}>{label}</span>
            <span className="text-sm font-bold text-center" style={{ color: "var(--text)", overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>{formatFn(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
