"use client";

import { useEffect, useState, useCallback, useRef, Suspense, type CSSProperties } from "react";
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
import { formatDate } from "@/lib/format-date";
import { listingSharePath } from "@/lib/listing-share";
import { readResponseJson } from "@/lib/read-response-json";
import { MarketPriceGuide } from "@/components/MarketPriceGuide";
import type { TcgCard } from "@/lib/tcggo";

function PlusIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CameraIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PhotoUploadZone({
  id,
  label,
  preview,
  onPick,
  dragLabel,
}: {
  id: string;
  label: string;
  preview: string | null;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dragLabel: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const galleryInputId = id;
  const cameraInputId = `${id}-camera`;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    void onPick(e);
    e.target.value = "";
    const siblingId = e.target.id === cameraInputId ? galleryInputId : cameraInputId;
    const sib = document.getElementById(siblingId) as HTMLInputElement | null;
    if (sib) sib.value = "";
  }

  const actionBtnClass =
    "inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-opacity border touch-manipulation flex-1 min-w-0 sm:min-w-[120px]";

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <div className="relative rounded-xl focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[var(--red)] focus-within:ring-offset-[var(--surface)]">
        <input
          id={galleryInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="sr-only"
        />
        <input
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="sr-only"
          aria-label={`Take a photo with the camera for ${label}`}
        />
        <div
          className="relative flex flex-col items-center justify-center gap-3 rounded-xl overflow-hidden transition-[border-color,background-color,box-shadow] min-h-[188px] sm:min-h-[220px] px-3 py-5 sm:px-4 sm:py-6 border-2 border-dashed"
          style={{
            borderColor: dragOver ? "var(--red)" : preview ? "var(--border)" : "color-mix(in srgb, var(--muted) 45%, transparent)",
            background: dragOver ? "color-mix(in srgb, var(--red) 8%, var(--surface))" : "var(--surface-raised)",
            boxShadow: dragOver ? "0 0 0 3px color-mix(in srgb, var(--red) 25%, transparent)" : undefined,
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (!f || !/^image\/(jpeg|png|webp)$/i.test(f.type)) return;
            const input = document.getElementById(galleryInputId) as HTMLInputElement | null;
            if (!input) return;
            const dt = new DataTransfer();
            dt.items.add(f);
            input.files = dt.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt=""
                className="absolute inset-0 z-0 w-full h-full object-contain p-2"
                style={{ background: "var(--surface)" }}
              />
              <div
                className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap gap-2 justify-center py-2.5 px-3"
                style={{
                  background: "linear-gradient(to top, color-mix(in srgb, var(--surface) 94%, black), transparent)",
                }}
              >
                <label
                  htmlFor={cameraInputId}
                  className={actionBtnClass}
                  style={{
                    background: "var(--red)",
                    color: "white",
                    borderColor: "transparent",
                  }}
                >
                  <CameraIcon className="shrink-0 w-5 h-5" style={{ color: "white" }} />
                  Camera
                </label>
                <label
                  htmlFor={galleryInputId}
                  className={actionBtnClass}
                  style={{
                    background: "color-mix(in srgb, var(--surface) 88%, var(--text))",
                    color: "var(--text)",
                    borderColor: "var(--border)",
                  }}
                >
                  Replace
                </label>
              </div>
            </>
          ) : (
            <>
              <PlusIcon
                className="shrink-0 pointer-events-none"
                style={{
                  color: dragOver ? "var(--red)" : "color-mix(in srgb, var(--muted) 85%, var(--text))",
                }}
              />
              <span className="text-sm font-semibold text-center pointer-events-none" style={{ color: "var(--text)" }}>
                Add photo
              </span>
              <span className="text-xs text-center max-w-[240px] leading-snug pointer-events-none" style={{ color: "var(--muted)" }}>
                {dragLabel}
              </span>
              <div className="flex flex-col sm:flex-row w-full max-w-sm gap-2 mt-1">
                <label
                  htmlFor={cameraInputId}
                  className={actionBtnClass}
                  style={{
                    background: "var(--red)",
                    color: "white",
                    borderColor: "transparent",
                  }}
                >
                  <CameraIcon className="shrink-0 w-6 h-6 sm:w-7 sm:h-7" style={{ color: "white" }} />
                  Use camera
                </label>
                <label
                  htmlFor={galleryInputId}
                  className={actionBtnClass}
                  style={{
                    background: "color-mix(in srgb, var(--surface) 92%, var(--text))",
                    color: "var(--text)",
                    borderColor: "var(--border)",
                  }}
                >
                  <PlusIcon className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" style={{ color: "var(--red)" }} />
                  Upload file
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [sellerSub, setSellerSub] = useState<{
    subscriptionProductConfigured: boolean;
    active: boolean;
    status: string | null;
    currentPeriodEnd: string | null;
  } | null>(null);

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
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/stripe/seller-subscription/status")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setSellerSub({
          subscriptionProductConfigured: Boolean(d.subscriptionProductConfigured),
          active: Boolean(d.active),
          status: d.status ?? null,
          currentPeriodEnd: d.currentPeriodEnd ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setSellerSub(null);
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
    if (
      stripePayout?.paymentsEnabled &&
      sellerSub?.subscriptionProductConfigured &&
      !sellerSub.active
    ) {
      setError("Activate your seller account ($5/month) before publishing — open Seller account.");
      return;
    }
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
      const uploadData = await readResponseJson<{
        error?: string;
        detail?: string;
        photoFrontUrl?: string;
        photoBackUrl?: string;
      }>(uploadRes);
      if (!uploadRes.ok) {
        const parts = [uploadData.error, uploadData.detail].filter(Boolean);
        throw new Error(parts.length ? parts.join(" — ") : "Image upload failed");
      }
      if (!uploadData.photoFrontUrl || !uploadData.photoBackUrl) {
        throw new Error("Upload succeeded but photo URLs were missing. Try again.");
      }

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
      const data = await readResponseJson<{ error?: string; id?: number }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to create listing");
      if (typeof data.id !== "number") throw new Error("Listing was created but the response was incomplete. Try refreshing the marketplace.");
      router.push(listingSharePath({ id: data.id, card_name: selected.name }));
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
          Front, back, and catalog reference images are stored on Vercel Blob when you publish. Set item price and postage separately.
          {stripePayout?.paymentsEnabled
            ? " Buyers pay with card; payouts go to your Stripe seller account (platform fee on each sale)."
            : null}
        </p>
      </div>

      {!payoutLoading &&
        stripePayout?.paymentsEnabled &&
        sellerSub?.subscriptionProductConfigured &&
        !sellerSub.active && (
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm font-medium">Seller account activation ($5 / month)</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Subscribe once to unlock publishing listings. This is a flat monthly platform fee, separate from Stripe Connect
              payouts and per-sale fees.
            </p>
            <Link href="/marketplace/sell/seller-account" className="btn-primary text-sm text-center">
              Activate seller account
            </Link>
          </div>
        )}

      {!payoutLoading &&
        stripePayout?.paymentsEnabled &&
        sellerSub?.subscriptionProductConfigured &&
        sellerSub.active && (
          <p className="text-xs rounded-lg px-3 py-2" style={{ background: "var(--surface-raised)", color: "var(--muted)" }}>
            Seller plan active
            {sellerSub.currentPeriodEnd
              ? ` · Renews or ends ${formatDate(sellerSub.currentPeriodEnd)}`
              : ""}
            .{" "}
            <Link href="/marketplace/sell/seller-account" className="underline" style={{ color: "var(--text)" }}>
              Manage
            </Link>
          </p>
        )}

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            <PhotoUploadZone
              id="sell-photo-front"
              label="Card front"
              preview={frontPreview}
              onPick={onPickFront}
              dragLabel="Camera, upload, or drop — JPG, PNG, or WebP"
            />
            <PhotoUploadZone
              id="sell-photo-back"
              label="Card back"
              preview={backPreview}
              onPick={onPickBack}
              dragLabel="Camera, upload, or drop — JPG, PNG, or WebP"
            />
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
