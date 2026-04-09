"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MAX_MESSAGE_CHARS } from "@/lib/marketplace-messages";

type Meta = {
  conversationId: number;
  listingId: number;
  listingStatus: string;
  cardName: string;
  setName: string | null;
  role: "buyer" | "seller";
  otherPartyName: string;
};

type Msg = {
  id: number;
  body: string;
  senderId: string;
  senderName: string | null;
  createdAt: string;
};

export default function MessageThreadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const bottomRef = useRef<HTMLDivElement>(null);

  const rawId = params?.id;
  const conversationId = rawId ? parseInt(rawId, 10) : NaN;
  const invalidId = rawId !== undefined && !Number.isFinite(conversationId);

  const [meta, setMeta] = useState<Meta | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!Number.isFinite(conversationId)) return;
    const r = await fetch(`/api/marketplace/conversations/${conversationId}/messages`);
    const d = await r.json();
    if (!r.ok) return;
    setMessages(d.messages ?? []);
  }, [conversationId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/auth/signin?callbackUrl=/marketplace/messages/${rawId ?? ""}`);
    }
  }, [status, router, rawId]);

  useEffect(() => {
    if (status !== "authenticated" || !Number.isFinite(conversationId)) return;
    let cancelled = false;
    setLoadError(null);
    fetch(`/api/marketplace/conversations/${conversationId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed");
        return d;
      })
      .then((d) => {
        if (cancelled) return;
        setMeta({
          conversationId: d.conversationId,
          listingId: d.listingId,
          listingStatus: d.listingStatus,
          cardName: d.cardName,
          setName: d.setName,
          role: d.role,
          otherPartyName: d.otherPartyName,
        });
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Error");
      });
    return () => {
      cancelled = true;
    };
  }, [status, conversationId]);

  useEffect(() => {
    if (status !== "authenticated" || !Number.isFinite(conversationId)) return;
    loadMessages();
    const t = setInterval(loadMessages, 5000);
    return () => clearInterval(t);
  }, [status, conversationId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(conversationId) || !text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/marketplace/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Send failed");
      setText("");
      await loadMessages();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  if (invalidId) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center flex flex-col gap-3">
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Invalid conversation link.
        </p>
        <Link href="/marketplace/messages" className="btn-primary text-center">
          Back to messages
        </Link>
      </div>
    );
  }

  if (status === "loading" || (status === "authenticated" && !loadError && !meta && Number.isFinite(conversationId))) {
    return (
      <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
        <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !meta || !session) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center flex flex-col gap-3">
        <p className="text-sm" style={{ color: "var(--red)" }}>
          {loadError ?? "Could not open conversation."}
        </p>
        <Link href="/marketplace/messages" className="btn-primary text-center">
          Back to messages
        </Link>
      </div>
    );
  }

  const myId = session.user.id;

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto min-h-[60vh]">
      <div>
        <Link href="/marketplace/messages" className="text-sm" style={{ color: "var(--muted)" }}>
          ← All messages
        </Link>
        <div className="mt-2 flex flex-col gap-0.5">
          <h1 className="text-lg font-bold leading-tight">{meta.cardName}</h1>
          {meta.setName && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {meta.setName}
            </p>
          )}
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            With {meta.otherPartyName} · you are the {meta.role}
            {meta.listingStatus !== "active" ? ` · listing ${meta.listingStatus}` : ""}
          </p>
          <Link href={`/marketplace/${meta.listingId}`} className="text-xs underline w-fit mt-1" style={{ color: "var(--eu-color)" }}>
            View listing →
          </Link>
        </div>
      </div>

      <div
        className="flex-1 flex flex-col gap-2 rounded-xl p-3 min-h-[240px] max-h-[50vh] overflow-y-auto"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
      >
        {messages.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>
            No messages yet. Say hello—ask about condition, postage, or pickup.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === myId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2 text-sm"
                  style={{
                    background: mine ? "var(--red)" : "var(--surface)",
                    color: mine ? "white" : "var(--text)",
                    border: mine ? "none" : "1px solid var(--border)",
                  }}
                >
                  {!mine && (
                    <p className="text-[10px] uppercase tracking-wide opacity-80 mb-0.5">
                      {m.senderName ?? "User"}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className="text-[10px] mt-1 opacity-70"
                    style={{ color: mine ? "rgba(255,255,255,0.85)" : "var(--muted)" }}
                  >
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex flex-col gap-2">
        <label className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
          Your message
        </label>
        <textarea
          className="input-field w-full min-h-[88px] resize-y"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
          placeholder="Write a message…"
          maxLength={MAX_MESSAGE_CHARS}
          aria-label="Message text"
        />
        <div className="flex justify-between items-center gap-2">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {text.length}/{MAX_MESSAGE_CHARS}
          </span>
          <button type="submit" className="btn-primary text-sm" disabled={sending || !text.trim()}>
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
