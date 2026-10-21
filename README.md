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
| `CMS_USERNAME` / `CMS_PASSWORD` | Initial dashboard credentials, used by `/cms/login` |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Optional, for higher GitHub API rate limits |
| `GISCUS_*` | Optional, enables comments on blog posts |
| `PUBLIC_GTAG_MEASUREMENT_ID` | Optional, analytics via Partytown |

Secrets stay in the environment — they are never written to the database.

## CMS Dashboard (`/cms`)

| Page | What you manage |
| --- | --- |
| `/cms` | Overview: counts, recent posts & projects |
| `/cms/posts` | Blog posts: markdown editor (GFM, Shiki, mermaid), tags, cover image, SEO title, draft/publish |
| `/cms/projects` | Portfolio projects: description, repo/demo URLs, tags, cover image, draft/publish |
| `/cms/profile` | Name, role, author bio, GitHub + LinkedIn links, site title/tagline/description, profile picture & banner uploads |
| `/cms/about` | Homepage + About-page intros and structured Experience / Skills / Education editors |
| `/cms/images` | Image library stored as BLOBs in SQLite; upload, set as avatar/banner, delete |

- Login is rate-limited; sessions are stored in SQLite and sent as HttpOnly cookies.
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
cp .env.example .env   # set CADDY_DOMAIN, SITE, CMS_PASSWORD, AI_API_KEY
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
src/lib/auth.ts      Credential check (env) + session helpers
src/middleware.ts    Guards /cms, CSRF checks, DB init
src/pages/cms/*      Dashboard pages and form endpoints
src/pages/media/[id].ts  Serves image blobs with caching
scripts/migrate-content.mjs  One-time import of legacy markdown content
```
