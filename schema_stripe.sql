-- Stripe Connect + Checkout (run on existing databases after initial schema.sql)
-- Safe to run multiple times

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_orders_stripe_checkout_session
  ON marketplace_orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
