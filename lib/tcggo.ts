export const TCGGO_BASE = "https://pokemon-tcg-api.p.rapidapi.com";

// ── Graded prices ─────────────────────────────────────────────────────────────
export interface GradedPrices {
  psa?: { psa10?: number; psa9?: number; psa8?: number };
  bgs?: { bgs10?: number; bgs9?: number; bgs8?: number };
  cgc?: { cgc10?: number; cgc9?: number; cgc8?: number };
}

// ── Price history data point ───────────────────────────────────────────────────
export interface PricePoint {
  date: string;
  price: number;
}

// ── Cardmarket prices ──────────────────────────────────────────────────────────
export interface CardmarketPrices {
  currency: string;
  lowest_near_mint?: number;
  lowest_near_mint_EU_only?: number;
  lowest_near_mint_DE?: number;
  lowest_near_mint_FR?: number;
  lowest_near_mint_ES?: number;
  lowest_near_mint_IT?: number;
  "30d_average"?: number;
  "7d_average"?: number;
  "1d_average"?: number;
  graded?: GradedPrices;
  history?: PricePoint[];
}

// ── TCGPlayer prices ───────────────────────────────────────────────────────────
export interface TcgPlayerPrices {
  currency: string;         // API normalises to "EUR" in practice
  market_price?: number;
  mid_price?: number;
  low_price?: number;
  high_price?: number;
}

// ── Episode (set) ──────────────────────────────────────────────────────────────
export interface TcgEpisode {
  id: number;
  name: string;
  slug?: string;
  released_at?: string;
  logo?: string;
  code?: string;
  cards_total?: number;
  cards_printed_total?: number;
  series?: { id: number; name: string; slug?: string };
  game?: { name: string; slug?: string };
}

// ── Artist ─────────────────────────────────────────────────────────────────────
export interface TcgArtist {
  id: number;
  name: string;
  slug?: string;
}

// ── External buy links ─────────────────────────────────────────────────────────
export interface TcgLinks {
  cardmarket?: string;
  tcgplayer?: string;
}

// ── Full Card model (matches real GET /cards/{id} response) ────────────────────
export interface TcgCard {
  id: number;
  name: string;
  name_numbered?: string;
  slug?: string;
  type?: string;
  card_number?: string | number;
  hp?: number;
  rarity?: string;
  supertype?: string;    // "Pokémon", "Trainer", "Energy"
  tcgid?: string;        // pokemontcg.io id, useful for cross-referencing
  flavor_text?: string | null;
  abilities?: null;      // Not populated by TCGGO (pricing API)
  attacks?: null;        // Not populated by TCGGO (pricing API)
  image?: string;
  tcggo_url?: string;
  links?: TcgLinks;
  cardmarket_id?: number;
  tcgplayer_id?: number;
  artist?: TcgArtist | string;  // object in detail, sometimes string in search
  episode?: TcgEpisode;
  prices?: {
    cardmarket?: CardmarketPrices;
    tcg_player?: TcgPlayerPrices;
  };
}

// ── Search response ────────────────────────────────────────────────────────────
export interface SearchResponse {
  data?: TcgCard[];
  cards?: TcgCard[];
  results?: TcgCard[];
}

// ── RapidAPI headers ───────────────────────────────────────────────────────────
export function tcgHeaders() {
  return {
    "x-rapidapi-key": process.env.RAPIDAPI_KEY ?? "",
    "x-rapidapi-host": "pokemon-tcg-api.p.rapidapi.com",
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Lowercase, strip accents, collapse punctuation to spaces (charizard-ex → charizard ex). */
function normalizeSearchText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokens used for matching: length ≥2, or any digit-only token (set numbers). */
function meaningfulTokens(normalizedQuery: string): string[] {
  const parts = normalizedQuery.split(/\s+/).filter(Boolean);
  return parts.filter((t) => t.length >= 2 || /^\d+$/.test(t));
}

/**
 * TCGGO search can return cards that only matched set/slug metadata.
 * Keep rows where every search token appears in the printed card identity
 * (name, name_numbered, card number).
 */
export function filterCardsBySearchRelevance(cards: TcgCard[], rawQuery: string): TcgCard[] {
  const normalized = normalizeSearchText(rawQuery);
  if (!normalized) return cards;

  let tokens = meaningfulTokens(normalized);
  if (tokens.length === 0) {
    if (normalized.length < 2) return cards;
    tokens = [normalized];
  }

  return cards.filter((card) => {
    const num = card.card_number != null ? String(card.card_number) : "";
    const haystack = normalizeSearchText(
      [card.name, card.name_numbered, num].filter(Boolean).join(" ")
    );
    return tokens.every((t) => haystack.includes(t));
  });
}

/** Normalise artist to a display string */
export function artistName(artist?: TcgArtist | string): string | undefined {
  if (!artist) return undefined;
  if (typeof artist === "string") return artist;
  return artist.name;
}

/** Build a chart data series from a card's price averages (synthetic 3-point) */
export function buildPriceHistory(card: TcgCard) {
  const cm  = card.prices?.cardmarket;
  const tcg = card.prices?.tcg_player;

  if (cm?.history && cm.history.length > 1) return cm.history;

  const now = Date.now();
  const day = 86_400_000;

  type Row = { date: string; eu?: number; us?: number };
  const rows: Row[] = [];

  if (cm?.["30d_average"] != null || tcg?.market_price != null) {
    rows.push({
      date: new Date(now - 30 * day).toISOString().slice(0, 10),
      eu: cm?.["30d_average"],
      us: tcg?.market_price,
    });
  }
  if (cm?.["7d_average"] != null) {
    rows.push({
      date: new Date(now - 7 * day).toISOString().slice(0, 10),
      eu: cm["7d_average"],
    });
  }
  if (cm?.lowest_near_mint != null || tcg?.market_price != null) {
    rows.push({
      date: new Date(now).toISOString().slice(0, 10),
      eu: cm?.lowest_near_mint,
      us: tcg?.market_price,
    });
  }
  return rows;
}
