-- Admin users: full bypass of seller subscription + Stripe Connect gates for listing (see lib/user-admin.ts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
