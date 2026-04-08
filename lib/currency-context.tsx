"use client";

import { createContext, useContext, useState, useEffect } from "react";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | "CHF" | "PLN" | "SEK" | "NOK";

export const CURRENCIES: { code: CurrencyCode; label: string; flag: string }[] = [
  { code: "USD", label: "USD", flag: "🇺🇸" },
  { code: "EUR", label: "EUR", flag: "🇪🇺" },
  { code: "GBP", label: "GBP", flag: "🇬🇧" },
  { code: "CAD", label: "CAD", flag: "🇨🇦" },
  { code: "AUD", label: "AUD", flag: "🇦🇺" },
  { code: "JPY", label: "JPY", flag: "🇯🇵" },
  { code: "CHF", label: "CHF", flag: "🇨🇭" },
  { code: "PLN", label: "PLN", flag: "🇵🇱" },
  { code: "SEK", label: "SEK", flag: "🇸🇪" },
  { code: "NOK", label: "NOK", flag: "🇳🇴" },
];

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** Convert a price from its native currency to the selected currency */
  convert: (amount: number, from: "EUR" | "USD") => number;
  format: (amount: number, from: "EUR" | "USD") => string;
  ratesLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  setCurrency: () => {},
  convert: (a) => a,
  format: (a) => a.toFixed(2),
  ratesLoading: true,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  // rates: 1 EUR = X currency. Fetched from Frankfurter API.
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1.08, GBP: 0.86, CAD: 1.47, AUD: 1.67, JPY: 161, CHF: 0.97, PLN: 4.17, SEK: 11.0, NOK: 11.4, EUR: 1 });
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CAD,AUD,JPY,CHF,PLN,SEK,NOK")
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates) {
          setRates({ ...data.rates, EUR: 1 });
        }
      })
      .catch(() => {/* use fallback rates */})
      .finally(() => setRatesLoading(false));
  }, []);

  function convert(amount: number, from: "EUR" | "USD"): number {
    const targetRate = rates[currency] ?? 1;
    if (from === "EUR") {
      return amount * targetRate;
    }
    // USD → target: divide by EUR→USD rate, multiply by EUR→target rate
    const eurToUsd = rates["USD"] ?? 1.08;
    return amount * (targetRate / eurToUsd);
  }

  function format(amount: number, from: "EUR" | "USD"): string {
    const converted = convert(amount, from);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "JPY" ? 0 : 2,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(converted);
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, format, ratesLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
