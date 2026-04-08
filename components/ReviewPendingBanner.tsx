"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PendingRow = {
  order_id: number;
  completed_at: string;
  card_name: string;
  set_name: string | null;
  seller_name: string | null;
};

export function ReviewPendingBanner() {
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/marketplace/reviews/pending")
      .then((r) => r.json())
      .then((d) => setPending(d.pending ?? []))
      .catch(() => setPending([]));
  }, []);

  if (dismissed || pending.length === 0) return null;

  const first = pending[0];

  return (
    <div
      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      style={{
        background: "rgba(244, 196, 48, 0.08)",
        border: "1px solid rgba(244, 196, 48, 0.35)",
      }}
    >
      <div className="min-w-0">
        <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
          Rate your seller
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          You bought <strong style={{ color: "var(--text)" }}>{first.card_name}</strong>
          {first.seller_name ? ` from ${first.seller_name}` : ""}. Your feedback helps other buyers.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <Link href={`/marketplace/orders?review=${first.order_id}`} className="btn-primary text-sm">
          Leave a review
        </Link>
        <button type="button" className="btn-ghost text-sm" onClick={() => setDismissed(true)}>
          Later
        </button>
      </div>
    </div>
  );
}
