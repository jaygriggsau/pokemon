"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Brush,
} from "recharts";
import { useCurrency } from "@/lib/currency-context";

function useNarrowChart() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

interface DataPoint {
  date: string;
  eu?: number;
  us?: number;
}

type TimeRange = "7d" | "30d" | "90d" | "all";

interface Props {
  data: DataPoint[];
  isSynthetic?: boolean;
  euAvg?: number;
  usAvg?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  const { format } = useCurrency();
  if (!active || !payload?.length) return null;

  const d = new Date(label);
  const formattedDate = !isNaN(d.getTime())
    ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : label;

  return (
    <div
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
        padding: "0.625rem 0.875rem",
        fontSize: "0.8125rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <p style={{ color: "var(--muted)", marginBottom: 6, fontWeight: 500 }}>{formattedDate}</p>
      {payload
        .filter((entry: { value?: number }) => entry.value != null)
        .map((entry: { name: string; value: number; color: string; dataKey: string }) => {
          if (entry.dataKey?.includes("Avg")) return null;
          return (
            <p key={entry.name} style={{ color: entry.color, fontWeight: 600, margin: "2px 0" }}>
              {entry.name === "eu" ? "Cardmarket (EU)" : "TCGPlayer (US)"}:{" "}
              {format(entry.value, entry.name === "eu" ? "EUR" : "USD")}
            </p>
          );
        })}
    </div>
  );
}

function TimeRangeSelector({
  range,
  onChange,
  disabled,
}: {
  range: TimeRange;
  onChange: (r: TimeRange) => void;
  disabled?: boolean;
}) {
  const options: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          className="text-xs font-semibold px-2.5 py-1 rounded-md transition-colors"
          style={{
            background: range === opt.value ? "var(--eu-color)" : "transparent",
            color: range === opt.value ? "white" : "var(--muted)",
            border: range === opt.value ? "none" : "1px solid var(--border)",
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function filterByRange(data: DataPoint[], range: TimeRange): DataPoint[] {
  if (range === "all" || data.length <= 3) return data;

  const now = Date.now();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date(now - days * 86_400_000).toISOString().slice(0, 10);

  const filtered = data.filter((d) => d.date >= cutoff);
  return filtered.length >= 2 ? filtered : data;
}

export function PriceChart({ data, isSynthetic, euAvg, usAvg }: Props) {
  const { format } = useCurrency();
  const narrow = useNarrowChart();
  const [range, setRange] = useState<TimeRange>("all");

  const filteredData = useMemo(() => filterByRange(data, range), [data, range]);

  const hasEu = filteredData.some((d) => d.eu != null);
  const hasUs = filteredData.some((d) => d.us != null);
  const showBrush = !isSynthetic && filteredData.length > 15;
  const chartH = narrow ? 240 : 320;
  const margin = narrow
    ? { top: 4, right: 4, bottom: showBrush ? 30 : 0, left: 0 }
    : { top: 8, right: 12, bottom: showBrush ? 30 : 4, left: 8 };
  const yAxisW = narrow ? 48 : 60;
  const tickFs = narrow ? 9 : 11;

  if (!hasEu && !hasUs) {
    return (
      <div
        className="flex items-center justify-center rounded-xl py-12 text-sm"
        style={{ border: "2px dashed var(--border)", color: "var(--muted)" }}
      >
        No price history available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {isSynthetic ? (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Estimated from 30-day average, 7-day average, 1-day average, and current price.
          </p>
        ) : (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {filteredData.length} data point{filteredData.length !== 1 ? "s" : ""}
          </p>
        )}
        {!isSynthetic && data.length > 3 && (
          <TimeRangeSelector range={range} onChange={setRange} />
        )}
      </div>

      <div style={{ width: "100%", height: chartH }} className="min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData} margin={margin}>
            <defs>
              <linearGradient id="euGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4a9eff" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#4a9eff" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="usGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e63946" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#e63946" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--muted)", fontSize: tickFs }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              interval="preserveStartEnd"
              tickFormatter={(v) => {
                const d = new Date(v);
                return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
              }}
            />
            <YAxis
              tick={{ fill: "var(--muted)", fontSize: tickFs }}
              axisLine={false}
              tickLine={false}
              width={yAxisW}
              domain={["auto", "auto"]}
              tickFormatter={(v) => format(v, hasEu ? "EUR" : "USD").replace(/\.00$/, "")}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: narrow ? 10 : 12, paddingTop: 4 }}
              formatter={(value: string) => (
                <span style={{ color: "var(--muted)", fontSize: narrow ? 10 : 12 }}>
                  {value === "eu" ? "Cardmarket (EU)" : value === "us" ? "TCGPlayer (US)" : value}
                </span>
              )}
            />

            {hasEu && (
              <Area
                type="monotone"
                dataKey="eu"
                fill="url(#euGradient)"
                stroke="transparent"
                connectNulls
                legendType="none"
              />
            )}
            {hasUs && (
              <Area
                type="monotone"
                dataKey="us"
                fill="url(#usGradient)"
                stroke="transparent"
                connectNulls
                legendType="none"
              />
            )}

            {hasEu && (
              <Line
                type="monotone"
                dataKey="eu"
                name="eu"
                stroke="#4a9eff"
                strokeWidth={2}
                dot={filteredData.length <= 20 ? { fill: "#4a9eff", r: 3, strokeWidth: 0 } : false}
                activeDot={{ r: 5, strokeWidth: 0, fill: "#4a9eff" }}
                connectNulls
              />
            )}
            {hasUs && (
              <Line
                type="monotone"
                dataKey="us"
                name="us"
                stroke="var(--red)"
                strokeWidth={2}
                dot={filteredData.length <= 20 ? { fill: "var(--red)", r: 3, strokeWidth: 0 } : false}
                activeDot={{ r: 5, strokeWidth: 0, fill: "var(--red)" }}
                connectNulls
              />
            )}

            {euAvg != null && hasEu && (
              <ReferenceLine
                y={euAvg}
                stroke="#4a9eff"
                strokeDasharray="6 4"
                strokeOpacity={0.5}
                label={{
                  value: "EU avg",
                  position: "insideTopRight",
                  fill: "#4a9eff",
                  fontSize: 10,
                  opacity: 0.7,
                }}
              />
            )}
            {usAvg != null && hasUs && (
              <ReferenceLine
                y={usAvg}
                stroke="var(--red)"
                strokeDasharray="6 4"
                strokeOpacity={0.5}
                label={{
                  value: "US avg",
                  position: "insideBottomRight",
                  fill: "var(--red)",
                  fontSize: 10,
                  opacity: 0.7,
                }}
              />
            )}

            <ReferenceLine y={0} stroke="var(--border)" />

            {showBrush && (
              <Brush
                dataKey="date"
                height={20}
                stroke="var(--border)"
                fill="var(--surface)"
                travellerWidth={8}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-GB", { month: "short" });
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
