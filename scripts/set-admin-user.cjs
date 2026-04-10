/**
 * One-off: add is_admin column and grant admin to an email.
 * Usage: node --env-file=.env.local scripts/set-admin-user.cjs <email>
 */
const { neon } = require("@neondatabase/serverless");

const email = process.argv[2] || "jay.griggs86@gmail.com";
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = neon(url);

(async () => {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`;
  const rows = await sql`
    UPDATE users
    SET is_admin = TRUE
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email.trim()}))
    RETURNING id, email, is_admin
  `;
  if (rows.length === 0) {
    console.error("No user with email:", email);
    process.exit(1);
  }
  console.log("Updated:", rows[0]);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
