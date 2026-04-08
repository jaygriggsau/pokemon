import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("[register] DATABASE_URL is not set");
    return NextResponse.json(
      { error: "Server is not configured for sign-up. Add DATABASE_URL to your environment." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const existing = await sql`SELECT id FROM users WHERE LOWER(TRIM(email)) = ${email} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const id = randomUUID();
    await sql`
      INSERT INTO users (id, name, email, password_hash)
      VALUES (${id}, ${name || null}, ${email}, ${hash})
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[register]", err);

    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("relation") && msg.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "Database tables are missing. Run the SQL in schema.sql on your database, then try again.",
        },
        { status: 503 }
      );
    }

    if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    if (msg.includes("connect") || msg.includes("ECONNREFUSED") || msg.includes("timeout")) {
      return NextResponse.json(
        { error: "Could not reach the database. Check DATABASE_URL and that your host allows connections from this server." },
        { status: 503 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again in a moment." },
      { status: 500 }
    );
  }
}
