"use client";

import { useState, useCallback, useRef } from "react";
import { CardItem } from "@/components/CardItem";
import type { TcgCard } from "@/lib/tcggo";

const SUGGESTIONS = ["Charizard ex", "Pikachu VMAX", "Mewtwo", "Lugia", "Umbreon VMAX", "Giratina VSTAR"];

export default function HomePage() {
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
      setError(e instanceof Error ? e.message : "Search failed");
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
          <h1 className="text-[1.65rem] leading-tight sm:text-4xl font-black tracking-tight mb-2 sm:mb-3">
            <span style={{ color: "var(--text)" }}>Pokémon Card</span>{" "}
            <span style={{ color: "var(--red)" }}>Prices</span>
          </h1>
          <p className="text-sm sm:text-base max-w-md mx-auto px-2" style={{ color: "var(--muted)" }}>
            EU Market &amp; US Market prices in your currency, one search.
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
