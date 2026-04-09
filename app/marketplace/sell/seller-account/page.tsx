"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format-date";

function SellerAccountContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [state, setState] = useState<{
    subscriptionProductConfigured: boolean;
    active: boolean;
    status: string | null;
    currentPeriodEnd: string | null;
    canManage: boolean;
  } | null>(null);

  const subSuccess = searchParams.get("sub_success") === "1";
  const subCanceled = searchParams.get("sub_canceled") === "1";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/marketplace/sell/seller-account");
    }
  }, [status, router]);

  const load = () => {
    setLoading(true);
    setLoadError(null);
    fetch("/api/stripe/seller-subscription/status")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed");
        return d;
      })
      .then((d) => {
        setState({
          subscriptionProductConfigured: Boolean(d.subscriptionProductConfigured),
          active: Boolean(d.active),
          status: d.status ?? null,
          currentPeriodEnd: d.currentPeriodEnd ?? null,
          canManage: Boolean(d.canManage),
        });
      })
      .catch(() => {
        setLoadError("Could not load subscription status.");
        setState(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    load();
  }, [status, searchParams]);

  async function startSubscribe() {
    setSubscribing(true);
    try {
      const res = await fetch("/api/stripe/seller-subscription/checkout", { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        if (d.alreadySubscribed) {
          load();
          return;
        }
        throw new Error(d.error ?? "Checkout failed");
      }
      if (d.url) window.location.href = d.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubscribing(false);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/seller-subscription/portal", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not open billing portal");
      if (d.url) window.location.href = d.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setPortalLoading(false);
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

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto flex flex-col gap-4 py-8">
        <p className="text-sm" style={{ color: "var(--red)" }}>
          {loadError}
        </p>
        <button type="button" className="btn-primary text-sm w-fit" onClick={load}>
          Retry
        </button>
        <Link href="/marketplace/sell" className="text-sm" style={{ color: "var(--muted)" }}>
          ← Sell a card
        </Link>
      </div>
    );
  }

  if (!state) return null;

  const configured = state.subscriptionProductConfigured;

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div>
        <Link href="/marketplace/sell" className="text-sm" style={{ color: "var(--muted)" }}>
          ← Sell a card
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold mt-2">Seller account activation</h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          Selling on this marketplace requires an active <strong>$5 per month</strong> seller plan. This is a flat platform
          fee to list your cards—it is separate from{" "}
          <Link href="/marketplace/earnings" className="underline" style={{ color: "var(--text)" }}>
            Stripe Connect payouts
          </Link>{" "}
          (how buyers pay you) and any per-sale application fee.
        </p>
      </div>

      {subSuccess && (
        <p className="text-sm rounded-lg px-3 py-2" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          Payment received. If your status still shows inactive, wait a few seconds and refresh—webhooks can take a moment.
        </p>
      )}
      {subCanceled && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Checkout was canceled. You can try again when you are ready.
        </p>
      )}

      {!configured && (
        <p className="text-sm rounded-lg p-4" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          Seller subscriptions are not configured on this server yet (missing price ID). You can still publish listings in
          this environment.
        </p>
      )}

      {configured && state.active && (
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm font-semibold">Your seller plan is active</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Status: <strong style={{ color: "var(--text)" }}>{state.status ?? "active"}</strong>
            {state.currentPeriodEnd && (
              <>
                {" "}
                · Current period ends {formatDate(state.currentPeriodEnd)}
              </>
            )}
          </p>
          {state.canManage && (
            <button type="button" className="btn-ghost text-sm w-fit" disabled={portalLoading} onClick={openPortal}>
              {portalLoading ? "Opening…" : "Manage billing & cancel"}
            </button>
          )}
        </div>
      )}

      {configured && !state.active && (
        <div className="flex flex-col gap-3">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Subscribe with a card to unlock publishing listings. You will be charged monthly until you cancel in the
            billing portal.
          </p>
          <button type="button" className="btn-primary w-fit" disabled={subscribing} onClick={startSubscribe}>
            {subscribing ? "Redirecting…" : "Subscribe — $5 / month"}
          </button>
        </div>
      )}

      <div className="text-xs pt-4 border-t" style={{ color: "var(--muted)", borderColor: "var(--border)" }}>
        <p className="mb-2">After subscribing you still need to complete Stripe Connect on the Sell page to receive card payments from buyers.</p>
        <Link href="/marketplace/sell" className="underline" style={{ color: "var(--eu-color)" }}>
          Back to sell flow →
        </Link>
      </div>
    </div>
  );
}

export default function SellerAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
          <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        </div>
      }
    >
      <SellerAccountContent />
    </Suspense>
  );
}
