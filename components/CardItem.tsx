"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCurrency } from "@/lib/currency-context";
import type { TcgCard } from "@/lib/tcggo";

interface Props {
  card: TcgCard;
  index?: number;
  inWatchlist?: boolean;
  onWatchlistChange?: (cardId: number, added: boolean) => void;
}

export function CardItem({ card, index = 99, inWatchlist = false, onWatchlistChange }: Props) {
  const { data: session } = useSession();
  const { format } = useCurrency();
  const [watched, setWatched] = useState(inWatchlist);
  const [watchLoading, setWatchLoading] = useState(false);

  const cmPrice = card.prices?.cardmarket;
  const tcgPrice = card.prices?.tcg_player;
  const hasEu = cmPrice?.lowest_near_mint != null;
  const hasUs = tcgPrice?.market_price != null;
  const tcgSourceCur: "EUR" | "USD" =
    tcgPrice?.currency?.toUpperCase() === "USD" ? "USD" : "EUR";

  async function toggleWatchlist(e: React.MouseEvent) {
    e.preventDefault();
    if (!session) return;
    setWatchLoading(true);
    try {
      if (watched) {
        await fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.id }),
        });
        setWatched(false);
        onWatchlistChange?.(card.id, false);
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: card.id,
            cardName: card.name,
            cardImage: card.image,
            setName: card.episode?.name,
          }),
        });
        setWatched(true);
        onWatchlistChange?.(card.id, true);
      }
    } finally {
      setWatchLoading(false);
    }
  }

  return (
    <div className="card-item group">
      {/* Image area */}
      <Link href={`/cards/${card.id}`} className="card-item-image" aria-label={`View ${card.name}`}>
        {card.image ? (
          <Image
            src={card.image}
            alt={card.name}
            fill
            sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 240px"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
            priority={index < 5}
            loading={index < 5 ? "eager" : "lazy"}
            quality={85}
          />
        ) : (
          <span className="card-item-no-image">?</span>
        )}

        {/* Hover overlay */}
        <span className="card-item-overlay">View details →</span>

        {/* Rarity badge */}
        {card.rarity && (
          <span className="card-item-rarity">{card.rarity}</span>
        )}

        {/* Watch star — only when signed in */}
        {session && (
          <button
            onClick={toggleWatchlist}
            disabled={watchLoading}
            className="card-item-star"
            aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
          >
            {watchLoading ? "·" : watched ? "★" : "☆"}
          </button>
        )}
      </Link>

      {/* Body */}
      <div className="card-item-body">
        <div className="card-item-meta">
          <Link
            href={`/cards/${card.id}`}
            className="card-item-name"
          >
            {card.name}
          </Link>
          {card.episode?.name && (
            <p className="card-item-set">
              {card.episode.name}
              {card.card_number && ` · #${card.card_number}`}
            </p>
          )}
        </div>

        {/* Prices */}
        {(hasEu || hasUs) ? (
          <div className="card-item-prices">
            {hasEu && (
              <div className="card-price-cell">
                <span className="card-price-label">Cardmarket (EU)</span>
                <span className="card-price-value">{format(cmPrice!.lowest_near_mint!, "EUR")}</span>
              </div>
            )}
            {hasUs && (
              <div className="card-price-cell card-price-cell--us">
                <span className="card-price-label">TCGPlayer (US)</span>
                <span className="card-price-value">{format(tcgPrice!.market_price!, tcgSourceCur)}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="card-item-no-price">No price data</p>
        )}
      </div>
    </div>
  );
}
