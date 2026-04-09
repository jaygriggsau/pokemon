"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatListingMinorAmount } from "@/lib/listing-money";
import type { ListingCurrency } from "@/lib/marketplace";
import { SellerRating } from "@/components/SellerRating";
import { SellerReviewsSection } from "@/components/SellerReviewsSection";
import type { PublicSellerReview } from "@/lib/seller-reviews-types";
import { listingSharePath, listingShareSegment, parseListingUrlSegment } from "@/lib/listing-share";
import { ShareLinkButton } from "@/components/ShareLinkButton";

type ListingRow = {
  id: number;
  seller_id: string;
  card_id: number;
  card_name: string;
  set_name: string | null;
  card_image: string | null;
  condition_grade: string;
  description: string | null;
  price_cents: number;
  postage_cents: number;
  currency: ListingCurrency;
  photo_front: string;
  photo_back: string;
  status: string;
  seller_name: string | null;
  seller_review_count: number | null;
  seller_avg_rating: string | number | null;
};

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [listing, setListing] = useState<ListingRow | null>(null);
  const [sellerReviews, setSellerReviews] = useState<PublicSellerReview[]>([]);
  const [cardCheckoutAvailable, setCardCheckoutAvailable] = useState(false);
  const [marketplacePaymentsEnabled, setMarketplacePaymentsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  const rawSegment = params?.id;
  const listingId = rawSegment ? parseListingUrlSegment(rawSegment) : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("checkout") === "cancelled") {
      alert("Checkout was canceled.");
      router.replace(pathname, { scroll: false });
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!rawSegment) return;
    if (listingId == null) {
      setLoading(false);
      setListing(null);
      setSellerReviews([]);
      setError("That listing link isn’t valid.");
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/marketplace/listings/${listingId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Listing not found.");
        setCardCheckoutAvailable(Boolean(d.cardCheckoutAvailable));
        setMarketplacePaymentsEnabled(Boolean(d.marketplacePaymentsEnabled));
        setSellerReviews(Array.isArray(d.sellerReviews) ? d.sellerReviews : []);
        return d.listing as ListingRow;
      })
      .then(setListing)
      .catch((e) => setError(e instanceof Error ? e.message : "Something went wrong."))
      .finally(() => setLoading(false));
  }, [rawSegment, listingId]);

  useEffect(() => {
    if (!listing || !rawSegment) return;
    const canonical = listingShareSegment(listing);
    if (rawSegment !== canonical) {
      router.replace(listingSharePath(listing), { scroll: false });
    }
  }, [listing, rawSegment, router]);

  async function buy() {
    if (!listing || !session) return;
    setBuying(true);
    try {
      if (cardCheckoutAvailable) {
        const res = await fetch("/api/marketplace/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: listing.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Checkout didn’t start.");
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("No checkout link returned.");
      }
      const ok = window.confirm(
        "Record this purchase without paying by card? (Only shown when this site isn’t using Stripe checkout.)"
      );
      if (!ok) return;
      const res = await fetch("/api/marketplace/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Purchase didn’t complete.");
      router.push(`/marketplace/orders?review=${data.orderId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBuying(false);
    }
  }

  async function messageSeller() {
    if (!listing || !session) return;
    setOpeningChat(true);
    try {
      const res = await fetch("/api/marketplace/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn’t open messages.");
      router.push(`/marketplace/messages/${data.conversationId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setOpeningChat(false);
    }
  }

  async function cancelListing() {
    if (!listing) return;
    if (!window.confirm("Cancel this listing?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/marketplace/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn’t cancel the listing.");
      router.refresh();
      setListing((L) => (L ? { ...L, status: "cancelled" } : null));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
        <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="text-center py-16 flex flex-col gap-3 items-center">
        <p className="font-semibold">Listing not found</p>
        <Link href="/marketplace" className="btn-primary">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const cur = listing.currency;
  const item = formatListingMinorAmount(listing.price_cents, cur);
  const post =
    listing.postage_cents > 0 ? formatListingMinorAmount(listing.postage_cents, cur) : "Free";
  const total = formatListingMinorAmount(listing.price_cents + listing.postage_cents, cur);
  const isSeller = session?.user?.id === listing.seller_id;
  const canBuy = Boolean(session && !isSeller && listing.status === "active");
  const sellerCardReady = !marketplacePaymentsEnabled || cardCheckoutAvailable;

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      <Link href="/marketplace" className="text-sm w-fit" style={{ color: "var(--muted)" }}>
        ← All listings
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Your photos
          </p>
          <div className="grid grid-cols-2 gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={listing.photo_front}
              alt="Front"
              className="rounded-xl w-full object-contain max-h-64"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={listing.photo_back}
              alt="Back"
              className="rounded-xl w-full object-contain max-h-64"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
            />
          </div>
          <div
            className="relative rounded-xl overflow-hidden w-full max-w-[200px] mx-auto md:mx-0"
            style={{ aspectRatio: "5/7", background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {listing.card_image ? (
              <Image
                src={listing.card_image}
                alt=""
                fill
                className="object-contain p-2"
                sizes="200px"
              />
            ) : null}
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Catalog image (reference only)
          </p>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{listing.card_name}</h1>
            {listing.set_name && (
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                {listing.set_name}
              </p>
            )}
            <p className="text-sm mt-2">
              <span style={{ color: "var(--muted)" }}>Condition:</span>{" "}
              <span className="font-medium">{listing.condition_grade}</span>
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Seller
            </span>
            <span className="font-medium">{listing.seller_name ?? "Seller"}</span>
            <SellerRating avg={listing.seller_avg_rating} count={listing.seller_review_count} size="md" />
          </div>

          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--muted)" }}>Item</span>
              <span className="font-semibold">{item}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--muted)" }}>Postage</span>
              <span className="font-semibold">{post}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="font-bold">Total</span>
              <span className="font-bold">{total}</span>
            </div>
          </div>

          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Status:{" "}
            <strong style={{ color: "var(--text)" }}>
              {listing.status === "active" ? "For sale" : listing.status === "sold" ? "Sold" : "Cancelled"}
            </strong>
          </p>

          {listing.description && (
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>
              {listing.description}
            </p>
          )}

          <Link
            href={`/cards/${listing.card_id}`}
            className="btn-ghost w-full text-center text-sm"
            style={{ borderColor: "var(--eu-color)", color: "var(--eu-color)" }}
          >
            View price chart &amp; market data for this card →
          </Link>

          <ShareLinkButton
            shareTitle={`${listing.card_name} on pokemove`}
            shareText={`${item} · ${listing.condition_grade}${listing.set_name ? ` · ${listing.set_name}` : ""}`}
          />

          {session && !isSeller && listing.status === "active" && (
            <button
              type="button"
              className="btn-ghost w-full text-sm"
              disabled={openingChat}
              onClick={messageSeller}
            >
              {openingChat ? "Opening…" : "Message seller"}
            </button>
          )}

          {session && isSeller && (
            <Link href="/marketplace/messages" className="btn-ghost w-full text-center text-sm">
              Your messages
            </Link>
          )}

          {listing.status === "active" && isSeller && (
            <button type="button" className="btn-ghost w-full" disabled={cancelling} onClick={cancelListing}>
              {cancelling ? "Cancelling…" : "Cancel listing"}
            </button>
          )}

          {marketplacePaymentsEnabled && canBuy && !cardCheckoutAvailable && (
            <p className="text-xs rounded-lg p-3" style={{ background: "var(--surface-raised)", color: "var(--muted)" }}>
              This seller can’t take card payments yet (Stripe setup isn’t finished). Try again later or arrange payment
              another way.
            </p>
          )}

          {canBuy && sellerCardReady && (
            <button type="button" className="btn-primary w-full" disabled={buying} onClick={buy}>
              {buying
                ? "Processing…"
                : cardCheckoutAvailable
                  ? "Pay with card"
                  : "Record purchase (no card)"}
            </button>
          )}

          {!session && listing.status === "active" && (
            <Link href="/auth/signin" className="btn-primary w-full text-center">
              Sign in to buy
            </Link>
          )}
        </div>
      </div>

      <SellerReviewsSection reviews={sellerReviews} />
    </div>
  );
}
