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

# Build the Astro server (SSR via @astrojs/node, standalone mode)
RUN npm run build

# Stage 2: Run the Node server that serves the site and the CMS dashboard
FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

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
