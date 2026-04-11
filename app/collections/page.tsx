"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CollectionRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  item_count: number;
}

export default function CollectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/collections");
    }
  }, [status, router]);

  const load = useCallback(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setCollections(d.collections ?? []);
      })
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const d = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(d.error ?? "Could not create collection.");
      return;
    }
    setName("");
    if (d.collection?.id) {
      router.push(`/collections/${d.collection.id}`);
    } else {
      load();
    }
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
    <div className="flex flex-col gap-8 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Collections</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Group cards together and see current reference value from Cardmarket (EU) and TCGPlayer, in your header
          currency.
        </p>
      </div>

      <form
        onSubmit={create}
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
      >
        <label className="text-sm font-medium" style={{ color: "var(--text)" }}>
          New collection
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="e.g. Master Set, Deck, Binder page…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            aria-label="Collection name"
          />
          <button type="submit" className="btn-primary shrink-0" disabled={creating || !name.trim()}>
            {creating ? "…" : "Create"}
          </button>
        </div>
        {error && (
          <p className="text-sm m-0" style={{ color: "var(--red)" }}>
            {error}
          </p>
        )}
      </form>

      {collections.length === 0 ? (
        <div
          className="rounded-xl py-14 text-center px-4"
          style={{ border: "2px dashed var(--border)", color: "var(--muted)" }}
        >
          <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>
            No collections yet
          </p>
          <p className="text-sm mb-4">Create one above, then add cards from any card page.</p>
          <Link href="/" className="btn-primary text-sm">
            Search cards
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 list-none m-0 p-0">
          {collections.map((c) => (
            <li key={c.id}>
              <Link
                href={`/collections/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors"
                style={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                <span className="font-semibold text-sm min-w-0 truncate">{c.name}</span>
                <span className="text-xs shrink-0 tabular-nums" style={{ color: "var(--muted)" }}>
                  {c.item_count} card{c.item_count !== 1 ? "s" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
