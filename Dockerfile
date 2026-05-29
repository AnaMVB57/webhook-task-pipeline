# ── Stage 1: Builder ──────────────────────────────────────────────────────────
# Compiles TypeScript to JavaScript in /dist
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@11.4.0 

# Copy dependency files first — Docker caches this layer if they don't change
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# ── Stage 2: Production ───────────────────────────────────────────────────────
# Lean image with only what's needed to run the app
FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g pnpm@11.4.0

# Copy dependency files and install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Copy static files served by Express
COPY public ./public

# Copy migrations so the migrate script can find them at runtime
COPY src/db/migrations ./src/db/migrations

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main.js"]