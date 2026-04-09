"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    let data: { error?: string } = {};
    try {
      const text = await res.text();
      if (text) data = JSON.parse(text) as { error?: string };
    } catch {
      setError("Unexpected server response. Please try again.");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(data.error ?? "Registration failed.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Account created but sign-in failed. Please sign in manually.");
      router.push("/auth/signin");
    } else {
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="max-w-sm mx-auto pt-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Join pokemove — prices, watchlist &amp; marketplace
        </p>
      </div>

      <div
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Name <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Ash Ketchum"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Email
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: "var(--red)" }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <Link href="/auth/signin" style={{ color: "var(--red)" }} className="font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
