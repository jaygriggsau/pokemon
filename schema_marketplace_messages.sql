-- Marketplace buyer/seller chat (run on existing DBs after base schema)
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
