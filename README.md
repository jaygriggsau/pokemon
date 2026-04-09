# pokePrice

Real-time Pokémon TCG price tracker. Search cards, compare EU (Cardmarket) and US (TCGPlayer) prices side by side, and keep a personal watchlist.

## Features

- **Card search** - search by name with debounced live results
- **Price data** - Cardmarket (EU, EUR) and TCGPlayer (US, USD) prices in one view
- **User accounts** - email/password sign-up, optional GitHub OAuth
- **Watchlist** - save cards to track across sessions
- **Marketplace** - peer-to-peer listings with photo uploads and optional Stripe card checkout (Connect payouts)

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth.js v4 |
| Database | Neon PostgreSQL (serverless) |
| Object storage | Vercel Blob (marketplace photos) |
| Payments | Stripe Checkout + Stripe Connect (Express sellers) |
| Price API | TCGGO via RapidAPI |
| Styling | Tailwind CSS v4 |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | [neon.tech](https://neon.tech) - free tier available |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production: your site origin (e.g. `https://your-domain.com`) |
| `RAPIDAPI_KEY` | [rapidapi.com/tcggopro/api/pokemon-tcg-api](https://rapidapi.com/tcggopro/api/pokemon-tcg-api) - free 100 req/day |
| `BLOB_READ_WRITE_TOKEN` | Marketplace photo uploads - token from your Vercel Blob store |
| `STRIPE_SECRET_KEY` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) - enables card checkout and Connect |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from your Stripe webhook endpoint (event: `checkout.session.completed`, `account.updated`) pointing to `/api/webhooks/stripe` |
| `STRIPE_PLATFORM_FEE_BPS` | Optional - platform fee in basis points (default `500` = 5% of each checkout, before Stripe processing fees) |
| `STRIPE_CONNECT_DEFAULT_COUNTRY` | Optional - 2-letter country for new Connect Express accounts (default `US`). Should match where most sellers are based. |
| `GITHUB_ID` / `GITHUB_SECRET` | Optional - [github.com/settings/developers](https://github.com/settings/developers) |

### 3. Set up the database

Create a PostgreSQL database, then run the SQL in `schema.sql` so users, sessions, watchlist, and marketplace tables exist. If you already ran an older schema, also run `schema_stripe.sql` for Stripe columns and indexes.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API routes

| Route | Method | Description |
|---|---|---|
| `/api/cards?q=charizard` | GET | Search cards (proxies TCGGO) |
| `/api/watchlist` | GET | Get current user's watchlist |
| `/api/watchlist` | POST | Add card to watchlist |
| `/api/watchlist` | DELETE | Remove card from watchlist |
| `/api/auth/register` | POST | Create new user account |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler |

## Notes

- The free TCGGO tier allows 100 requests/day. Card search results are cached for 5 minutes (`next: { revalidate: 300 }`).
- GitHub OAuth is opt-in - leave `GITHUB_ID` / `GITHUB_SECRET` unset to disable the button.
- **Stripe**: Turn on **Connect** in the Stripe Dashboard and complete platform profile requirements. Sellers onboard via Express accounts; buyers pay with Checkout; funds (minus your application fee) go to the seller's Connect balance. Sellers withdraw to their bank in the [Stripe Express Dashboard](https://stripe.com/docs/connect/express-dashboard) (linked from **Earnings**). For local webhook testing, use `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
- **Listing currencies**: Listings can use the same ISO codes as the site currency menu (USD, EUR, GBP, CAD, AUD, JPY, CHF, PLN, SEK, NOK). Stripe supports these as presentment currencies, but a **Connect account must be able to receive/settle** in that currency (depends on seller country and Stripe account settings)—otherwise Checkout may error until the seller switches listing currency or completes Stripe requirements.