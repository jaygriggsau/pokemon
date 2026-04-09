"use client";

import { useCallback, useState } from "react";

type Props = {
  /** Shown in native share sheet where supported */
  shareTitle: string;
  shareText?: string;
  className?: string;
};

export function ShareLinkButton({ shareTitle, shareText, className }: Props) {
  const [feedback, setFeedback] = useState<"idle" | "copied" | "error">("idle");

  const run = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url,
        });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setFeedback("copied");
        window.setTimeout(() => setFeedback("idle"), 2000);
        return;
      }
      throw new Error("no clipboard");
    } catch (e) {
      if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "AbortError") {
        return;
      }
      setFeedback("error");
      window.setTimeout(() => setFeedback("idle"), 2500);
    }
  }, [shareTitle, shareText]);

  const label =
    feedback === "copied" ? "Link copied" : feedback === "error" ? "Could not copy" : "Share listing";

  return (
    <button
      type="button"
      className={className ?? "btn-ghost w-full text-sm justify-center gap-2"}
      onClick={run}
      style={{ borderColor: "var(--border)" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
      {label}
    </button>
  );
}
