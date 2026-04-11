"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

function ReturnContent() {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const sessionId = searchParams.get("session_id");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setErr("Sign in to view this confirmation.");
      return;
    }
    if (!sessionId) {
      setErr("Missing checkout reference.");
      return;
    }
    fetch(`/api/marketplace/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Couldn’t verify payment.");
        if (d.paymentStatus === "paid") {
          setMsg("Payment received. Your order should appear in My orders within about a minute.");
        } else {
          setMsg(`Payment status: ${d.paymentStatus ?? "unknown"}. Check My orders for updates.`);
        }
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Couldn’t verify checkout."));
  }, [sessionId, status]);

  if (status === "loading" || (!err && !msg && status === "authenticated")) {
    return (
      <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
        <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto flex flex-col gap-6 py-12 px-4 text-center">
      <h1 className="text-xl font-bold">Checkout</h1>
      {err ? (
        <p className="text-sm" style={{ color: "var(--red)" }}>
          {err}
        </p>
      ) : (
        <p className="text-sm" style={{ color: "var(--text)" }}>
          {msg}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Link href="/marketplace/orders" className="btn-primary text-center">
          My orders
        </Link>
        <Link href="/marketplace" className="btn-ghost text-center">
          Back to listings
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
          <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
