"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrency } from "@/lib/currency-context";

type OrderRow = {
  id: number;
  listing_id: number;
  price_cents: number;
  postage_cents: number;
  currency: "USD" | "EUR";
  completed_at: string;
  card_id: number;
  card_name: string;
  set_name: string | null;
  counterparty_name: string | null;
  has_review: boolean;
};

function ReviewInline({
  orderId,
  onDone,
}: {
  orderId: number;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSending(true);
    try {
      const res = await fetch("/api/marketplace/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 p-3 rounded-lg flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
        Rate this seller
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          Stars
        </label>
        <select className="input-field text-sm py-1" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} — {n === 5 ? "Excellent" : n === 1 ? "Poor" : "Good"}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="input-field text-sm min-h-[72px] resize-y"
        placeholder="Optional comment for other buyers…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
      />
      {err && (
        <p className="text-xs" style={{ color: "var(--red)" }}>
          {err}
        </p>
      )}
      <button type="submit" className="btn-primary text-sm self-start" disabled={sending}>
        {sending ? "Saving…" : "Submit review"}
      </button>
    </form>
  );
}

function OrdersContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightReview = searchParams.get("review");
  const { format } = useCurrency();

  const [tab, setTab] = useState<"purchases" | "sales">("purchases");
  const [purchases, setPurchases] = useState<OrderRow[]>([]);
  const [sales, setSales] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openReviewId, setOpenReviewId] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch("/api/marketplace/orders")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed");
        return d;
      })
      .then((d) => {
        setPurchases(d.purchases ?? []);
        setSales(d.sales ?? []);
      })
      .catch(() => {
        setPurchases([]);
        setSales([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin?callbackUrl=/marketplace/orders");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    load();
  }, [status, load]);

  useEffect(() => {
    if (highlightReview) {
      const id = parseInt(highlightReview, 10);
      if (Number.isFinite(id)) {
        setTab("purchases");
        setOpenReviewId(id);
      }
    }
  }, [highlightReview]);

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
        <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const list = tab === "purchases" ? purchases : sales;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <Link href="/marketplace" className="text-sm" style={{ color: "var(--muted)" }}>
          ← Marketplace
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold mt-2">Orders</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Purchases you can review and sales you have made. When Stripe is enabled, sellers receive payouts through Stripe; use Earnings to open your seller dashboard.
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--surface-raised)" }}>
        <button
          type="button"
          className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            background: tab === "purchases" ? "var(--surface)" : "transparent",
            color: tab === "purchases" ? "var(--text)" : "var(--muted)",
            border: tab === "purchases" ? "1px solid var(--border)" : "1px solid transparent",
          }}
          onClick={() => setTab("purchases")}
        >
          Purchases
        </button>
        <button
          type="button"
          className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            background: tab === "sales" ? "var(--surface)" : "transparent",
            color: tab === "sales" ? "var(--text)" : "var(--muted)",
            border: tab === "sales" ? "1px solid var(--border)" : "1px solid transparent",
          }}
          onClick={() => setTab("sales")}
        >
          Sales
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: "var(--muted)" }}>
          Nothing here yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((o) => {
            const cur = o.currency;
            const total = format((o.price_cents + o.postage_cents) / 100, cur);
            const reviewExpanded =
              tab === "purchases" &&
              !o.has_review &&
              (openReviewId === o.id || highlightReview === String(o.id));

            return (
              <li
                key={o.id}
                className="card-surface p-4 flex flex-col gap-2"
                id={highlightReview === String(o.id) ? "highlight-order" : undefined}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{o.card_name}</p>
                    {o.set_name && (
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {o.set_name}
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-sm">{total}</p>
                </div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {tab === "purchases" ? "Seller" : "Buyer"}: {o.counterparty_name ?? "—"} ·{" "}
                  {new Date(o.completed_at).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/cards/${o.card_id}`} className="btn-ghost text-xs">
                    Price chart
                  </Link>
                  <Link href={`/marketplace/${o.listing_id}`} className="btn-ghost text-xs">
                    Listing
                  </Link>
                </div>
                {tab === "purchases" && !o.has_review && (
                  <>
                    {!reviewExpanded && (
                      <button type="button" className="btn-primary text-sm self-start" onClick={() => setOpenReviewId(o.id)}>
                        Review seller
                      </button>
                    )}
                    {reviewExpanded && (
                      <ReviewInline
                        orderId={o.id}
                        onDone={() => {
                          setOpenReviewId(null);
                          load();
                          router.replace("/marketplace/orders");
                        }}
                      />
                    )}
                  </>
                )}
                {tab === "purchases" && o.has_review && (
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    You left a review for this order.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
          <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
