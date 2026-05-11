"use client";

import { useCurrency } from "@/lib/currency-context";
import type { CardmarketPrices } from "@/lib/tcggo";

interface Props {
  cardmarket: CardmarketPrices;
}

const REGIONS: { key: keyof CardmarketPrices; label: string; flag: string }[] = [
  { key: "lowest_near_mint_EU_only", label: "EU only", flag: "🇪🇺" },
  { key: "lowest_near_mint_DE", label: "Germany", flag: "🇩🇪" },
  { key: "lowest_near_mint_FR", label: "France", flag: "🇫🇷" },
  { key: "lowest_near_mint_ES", label: "Spain", flag: "🇪🇸" },
  { key: "lowest_near_mint_IT", label: "Italy", flag: "🇮🇹" },
];

export function RegionalPrices({ cardmarket }: Props) {
  const { format } = useCurrency();
  const baseline = cardmarket.lowest_near_mint;

  const available = REGIONS.filter((r) => {
    const val = cardmarket[r.key];
    return val != null && typeof val === "number";
  });

  if (available.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--muted)" }}
      >
        Regional Near Mint (EU)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {available.map((region) => {
          const value = cardmarket[region.key] as number;
          const diff = baseline != null ? value - baseline : null;
          const pctDiff = baseline != null && baseline > 0 ? ((value - baseline) / baseline) * 100 : null;

          return (
            <div
              key={region.key}
              className="rounded-lg p-3 flex flex-col gap-1"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{region.flag}</span>
                <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                  {region.label}
                </span>
              </div>
              <span
                className="text-sm font-bold tabular-nums"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {format(value, "EUR")}
              </span>
              {diff != null && pctDiff != null && Math.abs(pctDiff) >= 0.5 && (
                <span
                  className="text-xs tabular-nums"
                  style={{
                    color: diff > 0 ? "#ef4444" : diff < 0 ? "#22c55e" : "var(--muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {diff > 0 ? "+" : ""}
                  {pctDiff.toFixed(1)}% vs global
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
