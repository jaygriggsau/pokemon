-- Seller $5/mo subscription (platform) — run on existing DBs
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_seller_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_subscription_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS seller_subscription_current_period_end TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_seller_customer_uidx
  ON users (stripe_seller_customer_id)
  WHERE stripe_seller_customer_id IS NOT NULL;
