-- Expand marketplace listing currency CHECK to match app display currencies (Stripe presentment).
ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_currency_check;
ALTER TABLE marketplace_listings ADD CONSTRAINT marketplace_listings_currency_check
  CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'PLN', 'SEK', 'NOK'));
