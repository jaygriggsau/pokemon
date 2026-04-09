"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type BalanceRow = { currency: string; available: number; pending: number };

export default function EarningsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<BalanceRow[] | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin?callbackUrl=/marketplace/earnings");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/stripe/connect/status")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setPaymentsEnabled(Boolean(d.paymentsEnabled));
        if (!d.paymentsEnabled) {
          setLoading(false);
          return;
        }
        if (!d.accountId) {
          setConnectError("Connect a seller account from the Sell page first.");
          setLoading(false);
          return;
        }
        return fetch("/api/stripe/connect/balance").then(async (r) => {
          const b = await r.json();
          if (cancelled) return;
          if (!r.ok) {
            setBalance([]);
            return;
          }
          setBalance(b.breakdown ?? []);
        });
      })
      .catch((e) => {
        if (!cancelled) setConnectError(e instanceof Error ? e.message : "Couldn’t load earnings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  async function openDashboard() {
    setOpening(true);
    try {
      const res = await fetch("/api/stripe/connect/dashboard", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Couldn’t open Stripe.");
      window.location.href = d.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setOpening(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
        <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6 py-4">
      <div>
        <Link href="/marketplace" className="text-sm" style={{ color: "var(--muted)" }}>
          ← Marketplace
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold mt-2">Seller earnings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Card sales are paid out through Stripe. Use the dashboard to add a bank account, see transfers, and track
          payouts to your bank (withdrawals).
        </p>
      </div>

      {paymentsEnabled === false && (
        <p className="text-sm rounded-xl p-4" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          Card payments are not enabled on this server yet.
        </p>
      )}

      {connectError && (
        <p className="text-sm" style={{ color: "var(--red)" }}>
          {connectError}
        </p>
      )}

      {paymentsEnabled && balance !== null && !connectError && (
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Stripe balance (seller account)
          </p>
          {balance.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No funds showing yet—normal if you have not received a paid sale.
            </p>
          ) : (
            <ul className="text-sm flex flex-col gap-2">
              {balance.map((b) => (
                <li key={b.currency} className="flex justify-between gap-4">
                  <span className="font-medium">{b.currency}</span>
                  <span style={{ color: "var(--muted)" }}>
                    Available {(b.available / 100).toFixed(2)} · Pending {(b.pending / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {paymentsEnabled && !connectError && (
        <button type="button" className="btn-primary w-full" disabled={opening} onClick={openDashboard}>
          {opening ? "Opening…" : "Open Stripe seller dashboard"}
        </button>
      )}

      <Link href="/marketplace/sell" className="btn-ghost text-center text-sm">
        Sell a card
      </Link>
    </div>
  );
}
