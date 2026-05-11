<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Architecture overview

Pokemove is a Next.js 16 (App Router, Turbopack) monolith — no microservices, no docker-compose for the app itself. Core features: Pokémon TCG card search/price comparison, watchlist, collections. Optional marketplace features are gated by `NEXT_PUBLIC_MARKETPLACE_ENABLED=true`.

### Local database setup (Neon-compatible)

The codebase uses `@neondatabase/serverless` with the `neon()` SQL-over-HTTP function (in `lib/db.ts`). For local development without a Neon cloud database, three services must run:

1. **PostgreSQL** (port 5432) — local instance with the `pokemove` superuser
2. **Neon HTTP proxy** (`ghcr.io/timowilhelm/local-neon-http-proxy:main`, Docker, `--network host`) — provides the SQL-over-HTTP endpoint on port 4444
3. **Caddy reverse proxy** (port 443) — terminates TLS for `api.localtest.me` and forwards to port 4444, because the `neon()` driver constructs `https://api.{host}/sql` from the `DATABASE_URL` hostname

**Key gotchas:**
- The `pokemove` PostgreSQL user **must** have `SUPERUSER` — the neon proxy queries `pg_authid` for authentication.
- `NODE_TLS_REJECT_UNAUTHORIZED=0` is needed in `.env.local` because Node.js (inside Turbopack workers) does not pick up the Caddy internal CA cert via `NODE_EXTRA_CA_CERTS`.
- `/etc/hosts` must include entries for `db.localtest.me` and `api.localtest.me` → `127.0.0.1`.
- The `instrumentation.ts` file configures `neonConfig.fetchEndpoint` for local use but is **not effective** under Turbopack (module isolation). The Caddy HTTPS proxy is what actually makes `neon()` work locally.

### Starting the local development stack

```bash
# 1. Start PostgreSQL
sudo pg_ctlcluster 16 main start

# 2. Start neon HTTP proxy (Docker, already pulled)
sudo docker start neon-proxy 2>/dev/null || \
  sudo docker run -d --name neon-proxy --network host \
    -e PG_CONNECTION_STRING="postgres://pokemove:pokemove123@localhost:5432/pokemove" \
    ghcr.io/timowilhelm/local-neon-http-proxy:main

# 3. Start Caddy HTTPS reverse proxy
sudo caddy start --config /etc/caddy/Caddyfile 2>/dev/null || true

# 4. Start dev server
npm run dev
```

### Commands reference

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 3000) |
| Lint | `npx eslint .` |
| Build | `npm run build` |
| DB schema | `PGPASSWORD=pokemove123 psql -h localhost -U pokemove -d pokemove -f schema.sql` |

### Environment variables

`.env.local` must contain at minimum:
- `DATABASE_URL=postgres://pokemove:pokemove123@db.localtest.me:5432/pokemove`
- `NEXTAUTH_SECRET` (any random 32-byte base64 string)
- `NEXTAUTH_URL=http://localhost:3000`
- `NODE_TLS_REJECT_UNAUTHORIZED=0`

`RAPIDAPI_KEY` is required for card search to return results (free tier at RapidAPI). Without it the app runs but searches fail gracefully.
