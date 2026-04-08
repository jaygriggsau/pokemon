"use client";

export function SellerRating({
  avg,
  count,
  size = "sm",
}: {
  avg: string | number | null | undefined;
  count: number | null | undefined;
  size?: "sm" | "md";
}) {
  const n = count ?? 0;
  const a = avg == null ? null : typeof avg === "string" ? parseFloat(avg) : Number(avg);
  const textSize = size === "md" ? "text-sm" : "text-xs";

  if (!n || a == null || Number.isNaN(a)) {
    return (
      <span className={textSize} style={{ color: "var(--muted)" }}>
        New seller · no reviews yet
      </span>
    );
  }

  return (
    <span className={`${textSize} font-medium`} style={{ color: "var(--muted)" }}>
      <span style={{ color: "var(--yellow)" }} aria-hidden>
        ★
      </span>{" "}
      {a.toFixed(1)} <span style={{ color: "var(--muted)" }}>({n} review{n !== 1 ? "s" : ""})</span>
    </span>
  );
}
