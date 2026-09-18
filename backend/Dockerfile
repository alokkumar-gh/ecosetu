# EcoSetu Backend Production Dockerfile
# Canonical Reference: docs/15_DEPLOYMENT_GUIDE.md Section 5

FROM node:20-slim AS base

# Install OpenSSL for Prisma engine binary compatibility
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies and generate Prisma client
RUN npm ci --omit=dev && npx prisma generate

# Copy application source
COPY src ./src

# Set secure ownership to unprivileged node user
RUN chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3001) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
