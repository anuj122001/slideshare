FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 4000
# migrate first, then start — safe to run on every boot (idempotent)
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
