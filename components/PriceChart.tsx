"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
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

interface Props {
  data: DataPoint[];
  isSynthetic?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  const { format } = useCurrency();
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
        padding: "0.625rem 0.875rem",
        fontSize: "0.8125rem",
      }}
    >
      <p style={{ color: "var(--muted)", marginBottom: 4 }}>{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <p key={entry.name} style={{ color: entry.color, fontWeight: 600 }}>
          {entry.name === "eu" ? "EU Market" : "US Market"}:{" "}
          {format(entry.value, entry.name === "eu" ? "EUR" : "USD")}
        </p>
      ))}
    </div>
  );
}

export function PriceChart({ data, isSynthetic }: Props) {
  const { format } = useCurrency();
  const narrow = useNarrowChart();
  const hasEu = data.some((d) => d.eu != null);
  const hasUs = data.some((d) => d.us != null);
  const chartH = narrow ? 220 : 280;
  const margin = narrow
    ? { top: 4, right: 4, bottom: 0, left: 0 }
    : { top: 8, right: 12, bottom: 4, left: 8 };
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
      {isSynthetic && (
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Showing 30-day average, 7-day average, and current price as data points.
        </p>
      )}
      <div style={{ width: "100%", height: chartH }} className="min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={margin}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--muted)", fontSize: tickFs }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "var(--muted)", fontSize: tickFs }}
              axisLine={false}
              tickLine={false}
              width={yAxisW}
              tickFormatter={(v) => format(v, hasEu ? "EUR" : "USD").replace(/\.00$/, "")}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: narrow ? 10 : 12 }}
              formatter={(value) => (
                <span style={{ color: "var(--muted)", fontSize: narrow ? 10 : 12 }}>
                  {value === "eu" ? "EU Market" : "US Market"}
                </span>
              )}
            />
            {hasEu && (
              <Line
                type="monotone"
                dataKey="eu"
                name="eu"
                stroke="#4a9eff"
                strokeWidth={2}
                dot={{ fill: "#4a9eff", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
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
                dot={{ fill: "var(--red)", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                connectNulls
              />
            )}
            <ReferenceLine y={0} stroke="var(--border)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
