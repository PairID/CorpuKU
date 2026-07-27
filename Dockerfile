FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOME=/app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup root nextjs

COPY --from=builder /app/public ./public

RUN mkdir -p .next && \
    chown -R nextjs:0 /app && \
    chmod -R g+rwX /app

COPY --from=builder --chown=nextjs:0 /app/.next/standalone ./
COPY --from=builder --chown=nextjs:0 /app/.next/static ./.next/static

USER 1001

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
