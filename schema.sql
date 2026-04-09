-- pokePrice database schema
-- Run this if setting up a new Neon / PostgreSQL database

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  image TEXT,
  password_hash TEXT,
  stripe_connect_account_id TEXT UNIQUE,
  stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_seller_customer_id TEXT UNIQUE,
  seller_subscription_id TEXT,
  seller_subscription_status TEXT,
  seller_subscription_current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  session_token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(identifier, token)
);

CREATE TABLE IF NOT EXISTS watchlist (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL,
  card_name TEXT NOT NULL,
  card_image TEXT,
  set_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- ─── Marketplace (peer listings; photo_front / photo_back = HTTPS URLs, e.g. Vercel Blob) ───
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id SERIAL PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL,
  card_name TEXT NOT NULL,
  set_name TEXT,
  card_image TEXT,
  condition_grade TEXT NOT NULL DEFAULT 'Near Mint',
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  postage_cents INTEGER NOT NULL DEFAULT 0 CHECK (postage_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'PLN', 'SEK', 'NOK')),
  photo_front TEXT NOT NULL,
  photo_back TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active_card
  ON marketplace_listings (card_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings (seller_id);

CREATE TABLE IF NOT EXISTS marketplace_orders (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id),
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_cents INTEGER NOT NULL,
  postage_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  UNIQUE (listing_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_orders_stripe_checkout_session
  ON marketplace_orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer ON marketplace_orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_seller ON marketplace_orders (seller_id);

CREATE TABLE IF NOT EXISTS seller_reviews (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller ON seller_reviews (seller_id);

-- ─── Marketplace messaging (buyer ↔ seller per listing) ───
CREATE TABLE IF NOT EXISTS marketplace_conversations (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_conv_buyer ON marketplace_conversations (buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_conv_seller ON marketplace_conversations (seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_conv_listing ON marketplace_conversations (listing_id);

CREATE TABLE IF NOT EXISTS marketplace_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES marketplace_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) <= 4000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_messages_conv ON marketplace_messages (conversation_id, created_at);
