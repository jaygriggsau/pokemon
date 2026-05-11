"use client";

import { useCurrency } from "@/lib/currency-context";
import type { CardmarketPrices, TcgPlayerPrices } from "@/lib/tcggo";

interface Props {
  cardmarket?: CardmarketPrices;
  tcgPlayer?: TcgPlayerPrices;
}

function SpreadBar({
  low,
  mid,
  high,
  current,
  currency,
  label,
  accentColor,
}: {
  low: number;
  mid?: number;
  high?: number;
  current?: number;
  currency: "EUR" | "USD";
  label: string;
  accentColor: string;
}) {
  const { format } = useCurrency();
  const max = Math.max(low, mid ?? 0, high ?? 0, current ?? 0);
  const scale = max > 0 ? 100 / max : 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ background: accentColor, color: "white", fontSize: "0.6rem" }}
        >
          {label}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>Price Spread</span>
      </div>

      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(low * scale, 2)}%`,
            background: `${accentColor}40`,
          }}
        />
        {high != null && (
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${Math.max(high * scale, 2)}%`,
              background: `${accentColor}25`,
            }}
          />
        )}
        {current != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 rounded-full"
            style={{
              left: `${current * scale}%`,
              background: accentColor,
              boxShadow: `0 0 4px ${accentColor}80`,
            }}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <SpreadLabel label="Low" value={format(low, currency)} />
        {mid != null && <SpreadLabel label="Mid" value={format(mid, currency)} />}
        {high != null && <SpreadLabel label="High" value={format(high, currency)} />}
        {current != null && (
          <SpreadLabel label="Current" value={format(current, currency)} bold />
        )}
      </div>
    </div>
  );
}

function SpreadLabel({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <span
        className="text-xs tabular-nums"
        style={{ fontWeight: bold ? 700 : 500, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
    </div>
  );
}

export function PriceSpread({ cardmarket, tcgPlayer }: Props) {
  const hasEuSpread =
    cardmarket?.lowest_near_mint != null &&
    (cardmarket["7d_average"] != null || cardmarket["30d_average"] != null);
  const hasUsSpread = tcgPlayer != null && tcgPlayer.low_price != null;

  if (!hasEuSpread && !hasUsSpread) return null;

  return (
    <div className="flex flex-col gap-4">
      {hasEuSpread && cardmarket && (
        <SpreadBar
          low={Math.min(
            cardmarket.lowest_near_mint ?? Infinity,
            cardmarket["7d_average"] ?? Infinity,
            cardmarket["30d_average"] ?? Infinity,
          )}
          mid={cardmarket["7d_average"]}
          high={Math.max(
            cardmarket.lowest_near_mint ?? 0,
            cardmarket["7d_average"] ?? 0,
            cardmarket["30d_average"] ?? 0,
          )}
          current={cardmarket.lowest_near_mint}
          currency="EUR"
          label="EU"
          accentColor="#4a9eff"
        />
      )}
      {hasUsSpread && tcgPlayer && (
        <SpreadBar
          low={tcgPlayer.low_price!}
          mid={tcgPlayer.mid_price ?? undefined}
          high={tcgPlayer.high_price ?? undefined}
          current={tcgPlayer.market_price ?? undefined}
          currency="USD"
          label="US"
          accentColor="#e63946"
        />
      )}
    </div>
  );
}
