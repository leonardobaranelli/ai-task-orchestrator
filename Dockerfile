# syntax=docker/dockerfile:1.7

# ---------- Stage 1: dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci --no-audit --no-fund

# ---------- Stage 2: builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

RUN npm prune --omit=dev

# ---------- Stage 3: runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache openssl tini \
    && addgroup -S nodejs -g 1001 \
    && adduser -S nestjs -u 1001 -G nodejs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3000) +'/api').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
