import type { CSSProperties } from "react";

/** Product name: pokemove (accent on "move", same pattern as the previous wordmark). */
export function BrandWordmark({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`font-bold tracking-tight ${className}`} style={{ color: "var(--text)", ...style }}>
      poke<span style={{ color: "var(--red)" }}>move</span>
    </span>
  );
}
