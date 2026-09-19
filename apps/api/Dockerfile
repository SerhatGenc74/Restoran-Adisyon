FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/desktop/package*.json ./apps/desktop/
COPY prisma ./prisma
COPY tsconfig.base.json ./

# Sadece bağımlılıkları kuralım (workspace için)
RUN npm install

# Kaynak kodları kopyala
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Prisma generate (API bağımlılıkları için gerekli)
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npx prisma generate --schema=prisma/schema.sqlite.prisma

# Uygulamaları build et
RUN npm run build --workspace=@adisyon/shared
RUN npm run build --workspace=@adisyon/api

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY prisma ./prisma

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

CMD ["npm", "start", "--workspace=@adisyon/api"]
