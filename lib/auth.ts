import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { fetchUserIsAdmin } from "@/lib/user-admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      /** Set from DB on each session read; admins bypass seller subscription / Connect for publishing. */
      isAdmin?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();

        const rows = await sql`
          SELECT id, name, email, password_hash
          FROM users
          WHERE LOWER(TRIM(email)) = ${email}
          LIMIT 1
        `;

        const user = rows[0];
        if (!user?.password_hash) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GithubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "github" && user.email) {
        const existing = await sql`SELECT id FROM users WHERE email = ${user.email} LIMIT 1`;
        if (existing.length === 0) {
          await sql`
            INSERT INTO users (name, email, image)
            VALUES (${user.name ?? null}, ${user.email}, ${user.image ?? null})
          `;
        }
        const dbUser = await sql`SELECT id FROM users WHERE email = ${user.email} LIMIT 1`;
        user.id = dbUser[0].id;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.isAdmin = await fetchUserIsAdmin(token.id);
      }
      return session;
    },
  },
};
