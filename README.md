# Devfolio — Astro + SQLite CMS

Personal portfolio/blog built with Astro 6 (SSR via the Node adapter), Tailwind CSS and a
built-in CMS dashboard. **All content — posts, projects, profile, about page, social links and
uploaded images — lives in a single SQLite database.**

## Quick start

```bash
npm install
npm run db:migrate   # one-time: imports existing content into SQLite (skips if already done)
npm run dev
```

Open http://localhost:4321 for the site and http://localhost:4321/cms for the dashboard.

### Environment

Copy `.env.example` to `.env` and set:

| Variable | Description |
| --- | --- |
| `SITE` | Public site origin (used for og images / canonical URLs) |
| `SQLITE_PATH` | SQLite file location, default `./data/cms.db` |
| `CMS_USERNAME` / `CMS_PASSWORD` | **Bootstrap only** — creates the CMS account on a fresh database, then ignored |
| `JWT_SECRET` | Optional 32+ char signing secret for CMS tokens (auto-generated in SQLite if empty) |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | Optional AI-assist fallbacks — values saved in `/cms/ai` override them |
| `AI_SECRET` | Optional 32+ char encryption secret for AI keys stored from the CMS |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Optional, for higher GitHub API rate limits |
| `GISCUS_*` | Optional, enables comments on blog posts |
| `PUBLIC_GTAG_MEASUREMENT_ID` | Optional, analytics via Partytown |

CMS login passwords are stored as salted **scrypt hashes** in SQLite (never plaintext), and
credentials can be changed from `/cms/account`. AI provider keys saved from the CMS are
encrypted with **AES-256-GCM** (they must be recoverable to call the provider) and are never
sent back to the browser.

## CMS Dashboard (`/cms`)

| Page | What you manage |
| --- | --- |
| `/cms` | Overview: counts, recent posts & projects |
| `/cms/posts` | Blog posts: markdown editor (GFM, Shiki, mermaid), tags, cover image, SEO title, draft/publish; **export/import all posts as JSON** (covers included) |
| `/cms/projects` | Portfolio projects: description, repo/demo URLs, tags, cover image, draft/publish |
| `/cms/profile` | Name, role, author bio, GitHub + LinkedIn links, site title/tagline/description, profile picture & banner uploads |
| `/cms/about` | Homepage + About-page intros and structured Experience / Skills / Education editors |
| `/cms/images` | Image library stored as BLOBs in SQLite; upload, set as avatar/banner, delete |
| `/cms/ai` | OpenAI-compatible provider: base URL, model, encrypted API key, connection test |
| `/cms/account` | Change the CMS username/password (requires the current password) |

- Login is rate-limited; sessions are stateless **JWTs** kept in an HttpOnly/SameSite cookie.
- Passwords are salted scrypt hashes in SQLite. `CMS_USERNAME`/`CMS_PASSWORD` only seed the
  account on first boot — after that the database is authoritative.
- Forgotten password? `npm run cms:reset-password -- <username> <password>`.
- Posts can be exported from `/cms/posts` and re-imported into another installation; an
  existing slug is updated in place, new slugs are created.
- Draft posts/projects are hidden from the public site until published.
- Public pages read SQLite at request time —CMS edits are live immediately, no rebuild.
- Images are served from `/media/{id}` with immutable caching headers.

## Database

- File: `data/cms.db` (gitignored; override with `SQLITE_PATH`).
- Stdlib driver (`node:sqlite`, Node ≥ 23) — no native dependency to compile.
- Schema lives in `src/lib/db.ts`; `scripts/migrate-content.mjs` performs the one-time markdown import.

## Deployment (Docker)

The stack runs as two containers: a Caddy reverse proxy (automatic TLS) in front of the Astro
standalone Node server.

One command from your machine (installs Docker on the VPS if needed, syncs the code, writes
`.env`, builds, starts and verifies HTTPS):

```bash
./deploy.sh user@your-vps yourdomain.com
```

Or run the steps manually:

```bash
cp .env.example .env   # set CADDY_DOMAIN, SITE, CMS_PASSWORD (AI/credentials can be set in the CMS)
docker compose up -d --build
```

- With `CADDY_DOMAIN` set to a public hostname, Caddy obtains and renews a Let's Encrypt
  certificate automatically; empty binds `localhost` for local testing.
- The Astro server is internal-only — Caddy publishes `80`/`443` and proxies to `app:4321`
  (HTTP/3 ready). Requires `Caddyfile` and the `caddy` service from `docker-compose.yml`.
- Standalone image works too, with baked-in defaults from the Dockerfile:
  `docker run -e CMS_PASSWORD=... -p 4321:4321 --env-file .env devfolio`

The `./data` bind mount keeps the SQLite database persistent across rebuilds.
Full walkthrough: **[DEPLOYMENT.md](./DEPLOYMENT.md)** — install Docker, open ports `80`/`443`,
point an A record at the server, fill `.env`, `docker compose up -d`.

## Project layout (new)

```
src/lib/db.ts        SQLite layer: schema + queries for posts/projects/settings/profile/about
src/lib/markdown.ts  Markdown → HTML processor (same pipeline the markdown files used)
src/lib/auth.ts      DB-backed credentials (scrypt) + credential changes
src/lib/password.ts  scrypt hashing/verification and validation rules
src/lib/jwt.ts       Stateless HS256 session tokens
src/lib/ai.ts        OpenAI-compatible client + CMS/env config resolution
src/lib/ai-crypto.ts AES-256-GCM encryption for provider keys
src/middleware.ts    Guards /cms, CSRF checks, DB init
src/pages/cms/*      Dashboard pages and form endpoints
src/pages/media/[id].ts  Serves image blobs with caching
scripts/migrate-content.mjs  One-time import of legacy markdown content
```
