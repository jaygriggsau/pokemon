import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { Navbar } from "@/components/Navbar";
import { CurrencyProvider } from "@/lib/currency-context";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "pokemove — Pokémon TCG prices & marketplace",
  description:
    "Search Pokémon cards, compare EU (Cardmarket) and US (TCGPlayer) prices in your currency, watchlist favorites, and buy or sell on the marketplace.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-screen flex flex-col antialiased overflow-x-hidden">
        <SessionProvider>
          <CurrencyProvider>
          <Navbar />
          <main className="flex-1 max-w-5xl w-full min-w-0 mx-auto px-3 py-4 pb-6 sm:px-4 sm:py-8 sm:pb-8 [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
          </CurrencyProvider>
          <footer
            className="text-center text-xs py-4 sm:py-6 px-3 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]"
            style={{ color: "var(--muted)", borderTop: "1px solid var(--border)" }}
          >
            Not affiliated with Nintendo or The Pokémon Company
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
