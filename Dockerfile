FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Provide a dummy DATABASE_URL so Prisma client can be generated without a live DB
ARG DATABASE_URL="postgresql://user:password@localhost:5432/db"
ARG AUTH_SECRET="build-time-placeholder-secret"
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libcap && \
    addgroup -S appgroup && adduser -S appuser -G appgroup && \
    setcap "cap_net_bind_service=+ep" /usr/local/bin/node

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=deps /app/node_modules ./node_modules
# Overwrite with the generated Prisma client from builder (deps stage never ran prisma generate)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY scripts/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh && \
    mkdir -p /app/public/uploads && \
    chown -R appuser:appgroup /app

USER appuser
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/api/health || exit 1

CMD ["sh", "./entrypoint.sh"]
