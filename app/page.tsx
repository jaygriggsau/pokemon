"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { CardItem } from "@/components/CardItem";
import { BrandWordmark } from "@/components/BrandWordmark";
import type { TcgCard } from "@/lib/tcggo";
import { marketplaceEnabled } from "@/lib/features";

const BENEFITS: {
  title: string;
  body: string;
  icon: React.ReactNode;
  marketplaceOnly?: boolean;
}[] = [
  {
    title: "EU & US prices together",
    body: "See Cardmarket and TCGPlayer reference pricing side by side, converted to the currency you choose in the header—no mental math across regions.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Watchlist your chase cards",
    body: "Sign in and save the cards you care about. Your list stays in one place so you can compare and revisit without searching again.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Buy & sell listings",
    body: "Browse listings with real photos, message sellers, and pay with card when checkout is enabled—or record purchases when you agree off-platform.",
    marketplaceOnly: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Reviews from real buyers",
    body: "After a completed order, buyers can rate sellers—so you get signal beyond photos and descriptions before you commit.",
    marketplaceOnly: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Charts per card",
    body: "Open any card for history and context—helpful when you are comparing prices over time or deciding whether to buy.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 3v18h18" strokeLinecap="round" />
        <path d="M7 16l4-4 4 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Share a listing in one tap",
    body: "Each listing has a readable URL (card name in the path). Use the Share button to copy the link or open your phone's share sheet—many apps show a preview with the card image and price.",
    marketplaceOnly: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" />
      </svg>
    ),
  },
];

const SUGGESTIONS = ["Charizard ex", "Pikachu VMAX", "Mewtwo", "Lugia", "Umbreon VMAX", "Giratina VSTAR"];

export default function HomePage() {
  const mp = marketplaceEnabled();
  const benefits = mp ? BENEFITS : BENEFITS.filter((b) => !b.marketplaceOnly);
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<TcgCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setCards([]); setSearched(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setCards(data.cards ?? []);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search didn’t work. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 500);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    search(query);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      {!searched && (
        <div className="text-center pt-4 pb-1 sm:pt-8 sm:pb-2 px-1">
          <h1 className="flex flex-col items-center gap-1 mb-2 sm:mb-3 text-center">
            <BrandWordmark className="text-[1.65rem] sm:text-4xl" />
            <span className="text-[1.35rem] leading-tight sm:text-2xl font-black tracking-tight block">
              <span style={{ color: "var(--text)" }}>Pokémon TCG</span>{" "}
              <span style={{ color: "var(--red)" }}>{mp ? "prices &amp; listings" : "prices &amp; watchlist"}</span>
            </span>
          </h1>
          <p className="text-sm sm:text-base max-w-md mx-auto px-2" style={{ color: "var(--muted)" }}>
            {mp
              ? "EU & US price data in your currency — search, watchlist, and trade."
              : "EU & US price data in your currency — search and watchlist your chase cards."}
          </p>
        </div>
      )}

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto w-full min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <div className="relative flex-1 min-w-0">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="var(--muted)" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: "2.5rem" }}
              placeholder="Search cards… e.g. Charizard ex"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary w-full sm:w-auto shrink-0" disabled={loading}>
            {loading
              ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : "Search"}
          </button>
        </div>
      </form>

      {/* Suggestions */}
      {!searched && (
        <div className="flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setQuery(s); search(s); }}
              className="suggestion-pill"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Benefits — shown before first search */}
      {!searched && (
        <section className="max-w-3xl mx-auto w-full pt-6 sm:pt-10 pb-2" aria-labelledby="home-benefits-heading">
          <h2
            id="home-benefits-heading"
            className="text-lg sm:text-xl font-bold text-center mb-1 flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0"
          >
            <span>What you get with</span>
            <BrandWordmark className="text-lg sm:text-xl" />
          </h2>
          <p className="text-sm text-center max-w-lg mx-auto mb-6 sm:mb-8 px-2" style={{ color: "var(--muted)" }}>
            {mp
              ? "Pricing tools and peer listings in one place—whether you are collecting, flipping, or checking a card before you trade."
              : "Reference pricing from major sources, converted to the currency you choose—built for collectors and buyers who want a clear read on value."}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 list-none m-0 p-0">
            {benefits.map((b) => (
              <li
                key={b.title}
                className="rounded-xl p-4 sm:p-5 flex gap-3 sm:gap-4"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
              >
                <span
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ color: "var(--red)", background: "rgba(230,57,70,0.12)" }}
                >
                  {b.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold m-0 mb-1 leading-snug">{b.title}</h3>
                  <p className="text-xs sm:text-sm m-0 leading-relaxed" style={{ color: "var(--muted)" }}>
                    {b.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div
            className="mt-6 sm:mt-8 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-sm font-semibold m-0 mb-0.5">{mp ? "Ready to browse or list?" : "Save cards to your watchlist"}</p>
              <p className="text-xs m-0" style={{ color: "var(--muted)" }}>
                {mp
                  ? "Search above, or open the listings hub and your account."
                  : "Search above, then sign in to keep favorites in one place."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 justify-center sm:justify-end w-full sm:w-auto">
              {mp && (
                <Link href="/marketplace" className="btn-primary text-center text-sm">
                  Browse listings
                </Link>
              )}
              <Link
                href="/auth/signup"
                className={mp ? "btn-ghost text-center text-sm" : "btn-primary text-center text-sm"}
                style={mp ? { borderColor: "var(--border)" } : undefined}
              >
                Create account
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Error */}
      {error && (
        <div
          className="text-sm text-center px-4 py-3 rounded-lg"
          style={{ background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.4)", color: "var(--red)" }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {searched && !loading && cards.length === 0 && !error && (
        <div className="text-center py-16" style={{ color: "var(--muted)" }}>
          <p className="text-lg font-semibold mb-1">No cards found</p>
          <p className="text-sm">Try a different name or check the spelling.</p>
        </div>
      )}

      {/* Results */}
      {cards.length > 0 && !loading && (
        <>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {cards.length} result{cards.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
          <div className="card-result-grid">
            {cards.map((card, i) => (
              <CardItem key={card.id} card={card} index={i} />
            ))}
          </div>
        </>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="card-result-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-img" />
              <div className="skeleton-body">
                <div className="skeleton-line" style={{ width: "72%" }} />
                <div className="skeleton-line" style={{ width: "50%" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
