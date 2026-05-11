"use client";

import { useCurrency } from "@/lib/currency-context";

interface StatSet {
  min: number;
  max: number;
  avg: number;
  first: number;
  last: number;
  changePct: number;
  changeAbs: number;
  spread: number;
  count: number;
}

interface Props {
  eu: StatSet | null;
  us: StatSet | null;
}

function DeltaBadge({ pct }: { pct: number }) {
  const isUp = pct > 0;
  const isFlat = Math.abs(pct) < 0.01;
  const color = isFlat ? "var(--muted)" : isUp ? "#22c55e" : "#ef4444";
  const arrow = isFlat ? "—" : isUp ? "▲" : "▼";
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded"
      style={{ color, background: `${color}14` }}
    >
      {arrow} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 min-w-0">
      <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>{label}</span>
      <div className="flex items-baseline gap-1.5 min-w-0">
        {sub}
        <span className="text-sm font-semibold tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

export function PriceStats({ eu, us }: Props) {
  const { format } = useCurrency();

  if (!eu && !us) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {eu && (
        <div
          className="rounded-xl p-4 flex flex-col gap-2"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderTop: "2px solid var(--eu-color)",
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ background: "var(--eu-color)", color: "white", fontSize: "0.6rem" }}
              >
                EU
              </span>
              <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Cardmarket Stats</span>
            </div>
            <DeltaBadge pct={eu.changePct} />
          </div>
          <StatRow label="Low" value={format(eu.min, "EUR")} />
          <StatRow label="High" value={format(eu.max, "EUR")} />
          <StatRow label="Average" value={format(eu.avg, "EUR")} />
          <StatRow label="Spread" value={format(eu.spread, "EUR")} />
          {eu.count > 1 && (
            <StatRow
              label="Change"
              value={format(Math.abs(eu.changeAbs), "EUR")}
              sub={
                <span className="text-xs" style={{ color: eu.changeAbs >= 0 ? "#22c55e" : "#ef4444" }}>
                  {eu.changeAbs >= 0 ? "+" : "−"}
                </span>
              }
            />
          )}
        </div>
      )}
      {us && (
        <div
          className="rounded-xl p-4 flex flex-col gap-2"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderTop: "2px solid var(--red)",
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ background: "var(--red)", color: "white", fontSize: "0.6rem" }}
              >
                US
              </span>
              <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>TCGPlayer Stats</span>
            </div>
            <DeltaBadge pct={us.changePct} />
          </div>
          <StatRow label="Low" value={format(us.min, "USD")} />
          <StatRow label="High" value={format(us.max, "USD")} />
          <StatRow label="Average" value={format(us.avg, "USD")} />
          <StatRow label="Spread" value={format(us.spread, "USD")} />
          {us.count > 1 && (
            <StatRow
              label="Change"
              value={format(Math.abs(us.changeAbs), "USD")}
              sub={
                <span className="text-xs" style={{ color: us.changeAbs >= 0 ? "#22c55e" : "#ef4444" }}>
                  {us.changeAbs >= 0 ? "+" : "−"}
                </span>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
