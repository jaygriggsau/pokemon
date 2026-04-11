"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type ConvRow = {
  id: number;
  listingId: number;
  listingStatus: string;
  cardName: string;
  setName: string | null;
  cardImage: string | null;
  lastBody: string | null;
  lastMessageAt: string | null;
  role: "buyer" | "seller";
  otherPartyName: string;
};

export default function MessagesInboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin?callbackUrl=/marketplace/messages");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/marketplace/conversations")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setConversations(d.conversations ?? []);
      })
      .catch(() => {
        if (!cancelled) setConversations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
        <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div>
        <Link href="/marketplace" className="text-sm" style={{ color: "var(--muted)" }}>
          ← Listings
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold mt-2">Messages</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Chats with buyers or sellers about listings. Be careful sharing personal details; keep payment on the site when
          card checkout is available.
        </p>
      </div>

      {conversations.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: "var(--muted)" }}>
          No conversations yet. Open a listing and use <strong>Message seller</strong> to start.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/marketplace/messages/${c.id}`}
                className="card-surface flex gap-3 p-3 items-center min-w-0 hover:opacity-95 transition-opacity"
              >
                <div
                  className="relative w-12 h-16 shrink-0 rounded overflow-hidden"
                  style={{ background: "var(--surface-raised)" }}
                >
                  {c.cardImage ? (
                    <Image src={c.cardImage} alt="" fill className="object-contain" sizes="48px" />
                  ) : (
                    <span className="text-xs flex items-center justify-center h-full">?</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{c.cardName}</p>
                  <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                    {c.role === "buyer" ? "Seller" : "Buyer"}: {c.otherPartyName}
                    {c.listingStatus !== "active" ? ` · listing ${c.listingStatus}` : ""}
                  </p>
                  {c.lastBody && (
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--muted)" }}>
                      {c.lastBody}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
