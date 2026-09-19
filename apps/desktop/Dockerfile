FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/desktop/package*.json ./apps/desktop/
COPY apps/api/package*.json ./apps/api/

# Sadece bağımlılıkları kuralım
RUN npm install

# Kaynak kodları kopyala
COPY packages/shared ./packages/shared
COPY apps/desktop ./apps/desktop

# Ortam değişkenini ayarla (Nginx proxy'si üzerinden çalışacak)
ENV VITE_API_URL=/api

# Uygulamaları build et
RUN npm run build --workspace=@adisyon/shared
RUN npm run build --workspace=@adisyon/desktop

FROM nginx:alpine

COPY --from=builder /app/apps/desktop/dist /usr/share/nginx/html
COPY apps/desktop/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
