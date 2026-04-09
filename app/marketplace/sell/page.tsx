"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CURRENCIES } from "@/lib/currency-context";
import {
  isZeroDecimalCurrency,
  parsePostageInputToMinorUnits,
  parsePriceInputToMinorUnits,
} from "@/lib/listing-money";
import { LISTING_CONDITIONS, LISTING_CURRENCIES, type ListingCurrency } from "@/lib/marketplace";
import { compressImageFile } from "@/lib/image-compress-client";
import { MarketPriceGuide } from "@/components/MarketPriceGuide";
import type { TcgCard } from "@/lib/tcggo";

function SellForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preCardId = searchParams.get("cardId");

  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<TcgCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TcgCard | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [price, setPrice] = useState("");
  const [postage, setPostage] = useState("0");
  const [currency, setCurrency] = useState<ListingCurrency>("USD");
  const [conditionGrade, setConditionGrade] = useState<string>(LISTING_CONDITIONS[0]);
  const [description, setDescription] = useState("");
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripePayout, setStripePayout] = useState<{
    paymentsEnabled: boolean;
    needsOnboarding: boolean;
    chargesEnabled: boolean;
  } | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin?callbackUrl=/marketplace/sell");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    setPayoutLoading(true);
    fetch("/api/stripe/connect/status")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setStripePayout({
          paymentsEnabled: Boolean(d.paymentsEnabled),
          needsOnboarding: Boolean(d.needsOnboarding),
          chargesEnabled: Boolean(d.chargesEnabled),
        });
      })
      .catch(() => {
        if (!cancelled) setStripePayout(null);
      })
      .finally(() => {
        if (!cancelled) setPayoutLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, searchParams]);

  useEffect(() => {
    if (!preCardId || selected) return;
    const id = parseInt(preCardId, 10);
    if (!Number.isFinite(id)) return;
    fetch(`/api/cards/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) setSelected(data as TcgCard);
      })
      .catch(() => {});
  }, [preCardId, selected]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setCards([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/cards?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setCards(data.cards ?? []);
    } catch {
      setCards([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleQuery(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 450);
  }

  async function onPickFront(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFrontPreview(null);
    if (!f) return;
    try {
      setFrontPreview(await compressImageFile(f));
    } catch {
      setError("Could not process front image");
    }
  }

  async function onPickBack(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setBackPreview(null);
    if (!f) return;
    try {
      setBackPreview(await compressImageFile(f));
    } catch {
      setError("Could not process back image");
    }
  }

  async function startPayoutSetup() {
    try {
      const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not start onboarding");
      if (d.url) window.location.href = d.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (stripePayout?.paymentsEnabled && !stripePayout.chargesEnabled) {
      setError("Finish Stripe seller onboarding before publishing.");
      return;
    }
    if (!selected) {
      setError("Select a card from search");
      return;
    }
    if (!frontPreview || !backPreview) {
      setError("Upload clear photos of the front and back");
      return;
    }
    const priceCents = parsePriceInputToMinorUnits(price, currency);
    if (priceCents == null) {
      setError(
        isZeroDecimalCurrency(currency)
          ? "Enter a whole-number price (no decimals for this currency)"
          : "Enter a valid item price"
      );
      return;
    }
    const postageCents = parsePostageInputToMinorUnits(postage, currency);
    if (postageCents === null) {
      setError("Enter valid postage (0 or more)");
      return;
    }

    setSubmitting(true);
    try {
      const frontBlob = await fetch(frontPreview).then((r) => r.blob());
      const backBlob = await fetch(backPreview).then((r) => r.blob());
      const up = new FormData();
      up.append("front", frontBlob, "front.jpg");
      up.append("back", backBlob, "back.jpg");

      const uploadRes = await fetch("/api/marketplace/upload", {
        method: "POST",
        body: up,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Image upload failed");

      const res = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: selected.id,
          cardName: selected.name,
          setName: selected.episode?.name ?? null,
          cardImage: selected.image ?? null,
          conditionGrade,
          description: description.trim() || null,
          priceCents,
          postageCents,
          currency,
          photoFrontUrl: uploadData.photoFrontUrl,
          photoBackUrl: uploadData.photoBackUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create listing");
      router.push(`/marketplace/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
        <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col gap-8 max-w-xl mx-auto">
      <div>
        <Link href="/marketplace" className="text-sm mb-2 inline-block" style={{ color: "var(--muted)" }}>
          ← Marketplace
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold">Sell a card</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Front and back photos are uploaded to secure storage; your listing stores the image links. Set item price and postage separately.
          {stripePayout?.paymentsEnabled
            ? " Buyers pay with card; payouts go to your Stripe seller account (platform fee on each sale)."
            : null}
        </p>
      </div>

      {!payoutLoading && stripePayout?.paymentsEnabled && !stripePayout.chargesEnabled && (
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm font-medium">Set up payouts to sell</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            This marketplace uses Stripe. Connect once so you can receive money when your cards sell. Withdraw to your bank
            from the Stripe seller dashboard.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-sm" onClick={startPayoutSetup}>
              Connect Stripe
            </button>
            <Link href="/marketplace/earnings" className="btn-ghost text-sm text-center">
              Earnings &amp; withdrawals
            </Link>
          </div>
        </div>
      )}

      {!payoutLoading && stripePayout?.paymentsEnabled && stripePayout.chargesEnabled && (
        <p className="text-xs rounded-lg px-3 py-2" style={{ background: "var(--surface-raised)", color: "var(--muted)" }}>
          Seller payouts connected. A platform fee (see site terms) is deducted from each sale before funds reach your Stripe
          balance.
        </p>
      )}

      {!selected ? (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Find your card
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Search like on the home page…"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
          />
          {searching && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Searching…
            </p>
          )}
          <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
            {cards.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCards([]);
                    setQuery("");
                    setSelected(c);
                    fetch(`/api/cards/${c.id}`)
                      .then((r) => r.json())
                      .then((data) => {
                        if (data?.id && !data.error) setSelected(data as TcgCard);
                      })
                      .catch(() => {});
                  }}
                  className="w-full flex items-center gap-3 p-2 text-left hover:opacity-90"
                  style={{ background: "var(--surface-raised)" }}
                >
                  <div className="relative w-10 h-14 shrink-0 rounded overflow-hidden" style={{ background: "var(--surface)" }}>
                    {c.image ? (
                      <Image src={c.image} alt="" fill className="object-contain" sizes="40px" />
                    ) : (
                      <span className="text-xs flex items-center justify-center h-full">?</span>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            <div className="relative w-14 h-20 shrink-0 rounded overflow-hidden" style={{ background: "var(--surface)" }}>
              {selected.image ? (
                <Image src={selected.image} alt="" fill className="object-contain" sizes="56px" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{selected.name}</p>
              {selected.episode?.name && (
                <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                  {selected.episode.name}
                </p>
              )}
            </div>
            <button type="button" className="btn-ghost text-xs shrink-0" onClick={() => setSelected(null)}>
              Change
            </button>
          </div>

          <MarketPriceGuide card={selected} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>
                Item price ({currency})
              </label>
              <input
                type="text"
                inputMode={isZeroDecimalCurrency(currency) ? "numeric" : "decimal"}
                className="input-field w-full"
                placeholder={isZeroDecimalCurrency(currency) ? "e.g. 1500" : "e.g. 24.99"}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>
                Postage ({currency})
              </label>
              <input
                type="text"
                inputMode={isZeroDecimalCurrency(currency) ? "numeric" : "decimal"}
                className="input-field w-full"
                placeholder={isZeroDecimalCurrency(currency) ? "0" : "0 for pickup / included"}
                value={postage}
                onChange={(e) => setPostage(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>
              Listing currency
            </label>
            <select
              className="input-field w-full sm:w-auto"
              aria-label="Listing currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as ListingCurrency)}
            >
              {LISTING_CURRENCIES.map((code) => {
                const meta = CURRENCIES.find((c) => c.code === code);
                return (
                  <option key={code} value={code}>
                    {meta ? `${meta.flag} ${code}` : code}
                  </option>
                );
              })}
            </select>
            <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
              Same codes as the site currency menu. Card checkout uses this currency; your Stripe Connect country must support
              receiving it—otherwise Checkout may fail until you change currency or finish Stripe requirements.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>
              Condition
            </label>
            <select
              className="input-field w-full"
              value={conditionGrade}
              onChange={(e) => setConditionGrade(e.target.value)}
            >
              {LISTING_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--muted)" }}>
              Description (optional)
            </label>
            <textarea
              className="input-field w-full min-h-[88px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="Grading notes, shipping preferences…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: "var(--muted)" }}>
                Card front photo
              </label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickFront} className="text-sm w-full" />
              {frontPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={frontPreview} alt="Front preview" className="mt-2 rounded-lg w-full max-h-48 object-contain" style={{ background: "var(--surface)" }} />
              )}
            </div>
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: "var(--muted)" }}>
                Card back photo
              </label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickBack} className="text-sm w-full" />
              {backPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={backPreview} alt="Back preview" className="mt-2 rounded-lg w-full max-h-48 object-contain" style={{ background: "var(--surface)" }} />
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--red)" }}>
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Publishing…" : "Publish listing"}
            </button>
            <Link href="/marketplace" className="btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function SellPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
          <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        </div>
      }
    >
      <SellForm />
    </Suspense>
  );
}
