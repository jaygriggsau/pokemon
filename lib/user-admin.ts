import { sql } from "@/lib/db";

/** Platform admin: can publish listings without seller subscription or Stripe Connect (buyers still need seller Connect for card pay). */
export async function fetchUserIsAdmin(userId: string): Promise<boolean> {
  try {
    const [row] = await sql`
      SELECT is_admin FROM users WHERE id = ${userId} LIMIT 1
    `;
    return Boolean((row as { is_admin?: boolean } | undefined)?.is_admin);
  } catch {
    return false;
  }
}
