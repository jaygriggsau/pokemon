"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { marketplaceEnabled } from "@/lib/features";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/admin");
    }
    if (status === "authenticated" && !session?.user?.isAdmin) {
      router.replace("/");
    }
  }, [status, session, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex justify-center py-24" style={{ color: "var(--muted)" }}>
        <span className="inline-block w-7 h-7 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  const mp = marketplaceEnabled();

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6 py-4">
      <div>
        <h1 className="text-xl font-bold">Admin</h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          {mp
            ? "You can publish listings without a paid seller plan or Stripe Connect. Moderation and analytics are not implemented yet—this page is a hub for tools as you add them."
            : "Listing tools are turned off. This page is a hub for admin utilities as you add them."}
        </p>
      </div>
      {mp ? (
        <ul className="flex flex-col gap-2 list-none m-0 p-0 text-sm">
          <li>
            <Link href="/marketplace/sell" className="underline" style={{ color: "var(--eu-color)" }}>
              Sell a card
            </Link>
          </li>
          <li>
            <Link href="/marketplace" className="underline" style={{ color: "var(--eu-color)" }}>
              Listings
            </Link>
          </li>
          <li>
            <Link href="/marketplace/sell/seller-account" className="underline" style={{ color: "var(--eu-color)" }}>
              Seller plan &amp; billing
            </Link>
          </li>
          <li>
            <Link href="/marketplace/earnings" className="underline" style={{ color: "var(--eu-color)" }}>
              Earnings (Stripe)
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
