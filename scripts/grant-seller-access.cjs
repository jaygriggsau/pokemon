/**
 * Set seller subscription fields so listing creation passes when STRIPE_SELLER_SUBSCRIPTION_PRICE_ID is set.
 * Does not create a Stripe subscription — use for trusted comp / support access only.
 *
 * Usage: node --env-file=.env.local scripts/grant-seller-access.cjs <email>
 */
const { neon } = require("@neondatabase/serverless");

const email = process.argv[2];
if (!email?.trim()) {
  console.error("Usage: node --env-file=.env.local scripts/grant-seller-access.cjs <email>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (use --env-file=.env.local or export it).");
  process.exit(1);
}

const sql = neon(url);

(async () => {
  const rows = await sql`
    UPDATE users
    SET
      seller_subscription_status = 'active',
      seller_subscription_current_period_end = TIMESTAMPTZ '2099-12-31 23:59:59+00'
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email.trim()}))
    RETURNING id, email, seller_subscription_status, seller_subscription_current_period_end
  `;
  if (rows.length === 0) {
    console.error("No user found with email:", email.trim());
    process.exit(1);
  }
  console.log("Updated:", rows[0]);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
