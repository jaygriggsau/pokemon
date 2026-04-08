"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCurrency, CURRENCIES, type CurrencyCode } from "@/lib/currency-context";

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { currency, setCurrency, ratesLoading } = useCurrency();

  const navLink = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className="px-3 py-2.5 sm:py-1.5 rounded-md text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 flex items-center justify-center"
      style={{
        color: active ? "var(--text)" : "var(--muted)",
        background: active ? "var(--surface-raised)" : "transparent",
      }}
    >
      {label}
    </Link>
  );

  const currencySelect = (
    <div className="relative">
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        disabled={ratesLoading}
        aria-label="Display currency"
        className="min-h-[44px] sm:min-h-0"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          borderRadius: "0.5rem",
          color: ratesLoading ? "var(--muted)" : "var(--text)",
          fontSize: "0.8125rem",
          fontWeight: 600,
          padding: "0.5rem 1.75rem 0.5rem 0.625rem",
          cursor: "pointer",
          outline: "none",
          appearance: "none",
          WebkitAppearance: "none",
          lineHeight: 1.4,
          touchAction: "manipulation",
        }}
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
        width="10"
        height="10"
        viewBox="0 0 10 6"
        fill="none"
      >
        <path d="M1 1l4 4 4-4" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );

  const authCluster = (compact: boolean) =>
    status === "loading" ? null : session ? (
      <>
        {!compact && (
          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }} className="hidden md:block max-w-[140px] truncate">
            {session.user?.name ?? session.user?.email}
          </span>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          className="btn-ghost"
          style={{ padding: compact ? "0.5rem 0.75rem" : "0.375rem 0.875rem", fontSize: "0.8125rem", minHeight: compact ? 44 : undefined }}
        >
          Sign out
        </button>
      </>
    ) : (
      <>
        <Link
          href="/auth/signin"
          className="btn-ghost"
          style={{ padding: compact ? "0.5rem 0.75rem" : "0.375rem 0.875rem", fontSize: "0.8125rem", minHeight: compact ? 44 : undefined }}
        >
          Sign in
        </Link>
        <Link
          href="/auth/signup"
          className="btn-primary"
          style={{ padding: compact ? "0.5rem 0.75rem" : "0.375rem 0.875rem", fontSize: "0.8125rem", minHeight: compact ? 44 : undefined }}
        >
          Sign up
        </Link>
      </>
    );

  return (
    <nav
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-4">
        <div className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:h-14 sm:py-0">
          {/* Row 1 mobile: brand + currency + auth */}
          <div className="flex items-center justify-between gap-2 sm:contents">
            <Link href="/" className="flex items-center gap-2 font-bold text-base sm:text-lg tracking-tight shrink-0 min-h-[44px] sm:min-h-0">
              <span
                style={{
                  background: "var(--red)",
                  color: "white",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                P
              </span>
              <span style={{ color: "var(--text)" }}>
                poke<span style={{ color: "var(--red)" }}>Price</span>
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:hidden shrink-0">
              {currencySelect}
              {authCluster(true)}
            </div>
          </div>

          {/* Row 2 mobile: nav links */}
          <div
            className="flex items-center justify-center gap-1 sm:flex-1 sm:justify-start border-t sm:border-t-0 pt-2 sm:pt-0"
            style={{ borderColor: "var(--border)" }}
          >
            {navLink("/", "Search", pathname === "/")}
            {session && navLink("/watchlist", "Watchlist", pathname === "/watchlist")}
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {currencySelect}
            {authCluster(false)}
          </div>
        </div>
      </div>
    </nav>
  );
}
