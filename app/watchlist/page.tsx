"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface WatchlistItem {
  id: number;
  card_id: number;
  card_name: string;
  card_image: string | null;
  set_name: string | null;
  created_at: string;
}

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/watchlist")
        .then((r) => r.json())
        .then((d) => {
          setItems(d.items ?? []);
          setLoading(false);
        });
    }
  }, [status]);

  async function removeItem(cardId: number) {
    setRemoving(cardId);
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId }),
    });
    setItems((prev) => prev.filter((i) => i.card_id !== cardId));
    setRemoving(null);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-24" style={{ color: "var(--muted)" }}>
        <span className="inline-block w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Your Watchlist</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {items.length} card{items.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <Link href="/" className="btn-ghost text-sm shrink-0 self-start sm:self-auto">
          + Add cards
        </Link>
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl text-center"
          style={{ border: "2px dashed var(--border)" }}
        >
          <p className="text-3xl mb-3">☆</p>
          <p className="font-semibold" style={{ color: "var(--text)" }}>
            Your watchlist is empty
          </p>
          <p className="text-sm mt-1 mb-5" style={{ color: "var(--muted)" }}>
            Search for cards and click ☆ Watch to add them here.
          </p>
          <Link href="/" className="btn-primary">
            Search cards
          </Link>
        </div>
      ) : (
        <div className="watchlist-grid">
          {items.map((item) => (
            <div key={item.id} className="card-surface flex flex-col overflow-hidden min-w-0">
              <div
                className="relative w-full flex items-center justify-center"
                style={{ background: "var(--surface-raised)", aspectRatio: "5/7" }}
              >
                {item.card_image ? (
                  <Image
                    src={item.card_image}
                    alt={item.card_name}
                    fill
                    sizes="(max-width: 639px) 45vw, 200px"
                    className="object-contain p-2"
                    loading="lazy"
                    quality={85}
                  />
                ) : (
                  <div className="text-4xl font-black" style={{ color: "var(--border)" }}>
                    ?
                  </div>
                )}
              </div>

              <div className="p-3 flex flex-col gap-2 flex-1">
                <div>
                  <p className="font-semibold text-sm leading-tight">{item.card_name}</p>
                  {item.set_name && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {item.set_name}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex gap-2">
                  <Link
                    href={`/cards/${item.card_id}`}
                    className="btn-ghost flex-1 text-xs"
                  >
                    View price
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeItem(item.card_id)}
                    disabled={removing === item.card_id}
                    className="btn-ghost text-xs shrink-0"
                    style={{
                      color: "var(--red)",
                      borderColor: "var(--red)",
                    }}
                  >
                    {removing === item.card_id ? "…" : "✕"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
