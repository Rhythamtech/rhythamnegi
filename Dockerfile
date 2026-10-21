# Stage 1: Build the Astro app (site + CMS)
FROM node:26-alpine AS builder

WORKDIR /app

# Set NODE_ENV to production for the build process
ENV NODE_ENV=production

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies
# We include devDependencies because they are required for the Astro build (astro check)
RUN npm ci --include=dev

# Copy the rest of the application source code
COPY . .

# Build-time configuration. PUBLIC_GTAG_MEASUREMENT_ID is baked into the
# client bundle by Astro/Vite (src/layouts/BaseLayout.astro), so it must be
# present during `npm run build`. Pass with: --build-arg PUBLIC_GTAG_…=G-XXX
ARG PUBLIC_GTAG_MEASUREMENT_ID=''
ENV PUBLIC_GTAG_MEASUREMENT_ID=$PUBLIC_GTAG_MEASUREMENT_ID

# Build the Astro server (SSR via @astrojs/node, standalone mode)
RUN npm run build

# Patch manifest to disable origin check (required for reverse proxy setups)
RUN sed -i 's/"checkOrigin":true/"checkOrigin":false/g' /app/dist/server/chunks/*.mjs

# Stage 2: Run the Node server that serves the site and the CMS dashboard
FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# ---- App configuration (image defaults, overridable) ----
# Standalone `docker run` works with these defaults. Everything is overridable:
#   docker run -e SITE=https://mysite.dev -e CMS_PASSWORD=... devfolio
# Secrets have NO defaults on purpose — do not bake passwords/tokens here;
# pass them at build time or runtime instead.
ARG SITE=http://localhost:4321
ARG SQLITE_PATH=/app/data/cms.db
ARG CMS_USERNAME=admin
ARG CMS_PASSWORD=
ARG GITHUB_PERSONAL_ACCESS_TOKEN=
ARG AI_BASE_URL=https://api.groq.com/openai/v1
ARG AI_API_KEY=
ARG AI_MODEL=llama-3.3-70b-versatile
ARG GISCUS_REPO=
ARG GISCUS_REPO_ID=
ARG GISCUS_CATEGORY=
ARG GISCUS_CATEGORY_ID=
ENV SITE=$SITE \
	SQLITE_PATH=$SQLITE_PATH \
	CMS_USERNAME=$CMS_USERNAME \
	CMS_PASSWORD=$CMS_PASSWORD \
	GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN \
	AI_BASE_URL=$AI_BASE_URL \
	AI_API_KEY=$AI_API_KEY \
	AI_MODEL=$AI_MODEL \
	GISCUS_REPO=$GISCUS_REPO \
	GISCUS_REPO_ID=$GISCUS_REPO_ID \
	GISCUS_CATEGORY=$GISCUS_CATEGORY \
	GISCUS_CATEGORY_ID=$GISCUS_CATEGORY_ID

# Only runtime dependencies are needed for the standalone server (e.g. sharp)
COPY package*.json ./
RUN npm ci --omit=dev

# Server bundle + static client assets produced by the Astro build
COPY --from=builder /app/dist ./dist

# SQLite database lives in /app/data — mount a volume here to persist it
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:4321/ || exit 1

CMD ["node", "./dist/server/entry.mjs"]
