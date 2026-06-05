# ── Stage 1: Build ────────────────────────────────────────────────────────────
# Use Node 20 to install dependencies and compile TypeScript → JavaScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first so Docker can cache the install layer
COPY package*.json ./

# Install ALL dependencies (including devDeps like typescript, tsx)
RUN npm ci

# Copy source code and compile
COPY . .
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
# Start fresh with a clean image — no dev tools, just the compiled output
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install only production dependencies (no typescript, tsx, drizzle-kit, etc.)
RUN npm ci --omit=dev

# Copy compiled JavaScript from the builder stage
COPY --from=builder /app/dist ./dist

# Drop root privileges — run as an unprivileged system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001

CMD ["node", "dist/index.js"]
