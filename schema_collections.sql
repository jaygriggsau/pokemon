-- Collections: run on existing databases after base schema.sql
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_user ON collections (user_id);

CREATE TABLE IF NOT EXISTS collection_items (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL,
  card_name TEXT NOT NULL,
  card_image TEXT,
  set_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 999),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items (collection_id);
