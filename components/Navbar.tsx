"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCurrency, CURRENCIES, type CurrencyCode } from "@/lib/currency-context";

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </>
      )}
    </svg>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { currency, setCurrency, ratesLoading } = useCurrency();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

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

  const mobileNavLink = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      onClick={() => setMenuOpen(false)}
      className="flex items-center w-full min-h-[48px] px-4 py-3 rounded-lg text-base font-medium transition-colors"
      style={{
        color: active ? "var(--text)" : "var(--muted)",
        background: active ? "var(--surface-raised)" : "transparent",
      }}
    >
      {label}
    </Link>
  );

  const currencySelect = (className?: string) => (
    <div className={`relative ${className ?? ""}`}>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        disabled={ratesLoading}
        aria-label="Display currency"
        className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
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

  const authCluster = (opts: { compact?: boolean; mobileDrawer?: boolean }) => {
    const { compact, mobileDrawer } = opts;
    const stack = mobileDrawer ? "flex flex-col gap-2 w-full" : "flex items-center gap-2";
    return status === "loading" ? null : session ? (
      <div className={stack}>
        {!compact && !mobileDrawer && (
          <span
            style={{ color: "var(--muted)", fontSize: "0.8rem" }}
            className="hidden md:block max-w-[140px] truncate"
          >
            {session.user?.name ?? session.user?.email}
          </span>
        )}
        {mobileDrawer && (session.user?.name ?? session.user?.email) && (
          <p className="text-sm px-1 truncate" style={{ color: "var(--muted)" }}>
            {session.user?.name ?? session.user?.email}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            signOut();
          }}
          className="btn-ghost w-full sm:w-auto justify-center"
          style={{
            padding: compact || mobileDrawer ? "0.5rem 0.75rem" : "0.375rem 0.875rem",
            fontSize: "0.8125rem",
            minHeight: compact || mobileDrawer ? 44 : undefined,
          }}
        >
          Sign out
        </button>
      </div>
    ) : (
      <div className={mobileDrawer ? "flex flex-col gap-2 w-full" : "flex items-center gap-2"}>
        <Link
          href="/auth/signin"
          onClick={() => mobileDrawer && setMenuOpen(false)}
          className="btn-ghost w-full sm:w-auto justify-center"
          style={{
            padding: compact || mobileDrawer ? "0.5rem 0.75rem" : "0.375rem 0.875rem",
            fontSize: "0.8125rem",
            minHeight: compact || mobileDrawer ? 44 : undefined,
          }}
        >
          Sign in
        </Link>
        <Link
          href="/auth/signup"
          onClick={() => mobileDrawer && setMenuOpen(false)}
          className="btn-primary w-full sm:w-auto justify-center"
          style={{
            padding: compact || mobileDrawer ? "0.5rem 0.75rem" : "0.375rem 0.875rem",
            fontSize: "0.8125rem",
            minHeight: compact || mobileDrawer ? 44 : undefined,
          }}
        >
          Sign up
        </Link>
      </div>
    );
  };

  const brand = (
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
          fontSize: 11,
          fontWeight: 800,
          flexShrink: 0,
          letterSpacing: "-0.02em",
        }}
      >
        PM
      </span>
      <BrandWordmark className="text-base sm:text-lg" />
    </Link>
  );

  const mainNav = (mobile: boolean) => {
    const mk = mobile ? mobileNavLink : navLink;
    return (
      <>
        {mk("/", "Search", pathname === "/")}
        {mk("/marketplace", "Marketplace", pathname === "/marketplace" || pathname.startsWith("/marketplace/"))}
        {session && mk("/watchlist", "Watchlist", pathname === "/watchlist")}
        {session && mk("/marketplace/messages", "Messages", pathname.startsWith("/marketplace/messages"))}
        {session &&
          mk("/marketplace/sell/seller-account", "Seller plan", pathname === "/marketplace/sell/seller-account")}
        {session && mk("/marketplace/earnings", "Earnings", pathname === "/marketplace/earnings")}
      </>
    );
  };

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
        {/* Mobile header */}
        <div className="flex sm:hidden items-center justify-between gap-3 min-h-[52px] py-2">
          {brand}
          <button
            type="button"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg -mr-1"
            style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--surface-raised)" }}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
            id="mobile-nav-toggle"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <HamburgerIcon open={menuOpen} />
          </button>
        </div>

        {/* Desktop bar */}
        <div className="hidden sm:flex flex-row items-center justify-between gap-3 h-14">
          {brand}
          <div className="flex items-center justify-center gap-1 flex-1 justify-start flex-wrap">
            {mainNav(false)}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {currencySelect()}
            {authCluster({})}
          </div>
        </div>
      </div>

      {/* Mobile drawer + backdrop */}
      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[100] sm:hidden cursor-default border-0 p-0"
            style={{ background: "rgba(0,0,0,0.45)" }}
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-nav-drawer-title"
            className="fixed top-0 right-0 bottom-0 z-[101] w-[min(100%,20rem)] sm:hidden flex flex-col shadow-xl"
            style={{
              background: "var(--surface)",
              borderLeft: "1px solid var(--border)",
              paddingTop: "max(0.75rem, env(safe-area-inset-top))",
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex items-center justify-between gap-2 px-4 pb-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
              <h2 id="mobile-nav-drawer-title" className="text-sm font-semibold m-0" style={{ color: "var(--text)" }}>
                Menu
              </h2>
              <button
                type="button"
                className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-sm font-medium"
                style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <HamburgerIcon open />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 flex flex-col gap-1">
              {mainNav(true)}
              <div className="h-px my-3 mx-1 shrink-0" style={{ background: "var(--border)" }} />
              <p className="text-xs font-medium uppercase tracking-wide px-2 mb-1" style={{ color: "var(--muted)" }}>
                Currency
              </p>
              <div className="px-1 pb-2">{currencySelect("w-full")}</div>
              <div className="h-px my-2 mx-1 shrink-0" style={{ background: "var(--border)" }} />
              <p className="text-xs font-medium uppercase tracking-wide px-2 mb-1" style={{ color: "var(--muted)" }}>
                Account
              </p>
              <div className="px-1 flex flex-col gap-2">{authCluster({ mobileDrawer: true })}</div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
