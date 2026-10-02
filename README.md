# Çorbacı Adisyon Sistemi

Çorbacı ve benzeri hızlı servis restoranlarında **masa, sipariş, mutfak, kasa ve gün sonu işlemlerini** tek bir masaüstü uygulamasından yöneten adisyon sistemi.

---

## Hızlı Başlangıç

### Gereksinimler

- Node.js 20 veya üzeri
- npm 10 veya üzeri
- PostgreSQL 15 veya üzeri (veya Docker Desktop)
- Tauri masaüstü derlemesi için Rust ve sistem bağımlılıkları

### Yerel PostgreSQL ile kurulum

1. Depoyu klonlayın:

   ```bash
   git clone <depo-adresi>
   cd Restraunt-adisyon
   ```

2. Bağımlılıkları kurun ve ortam dosyasını oluşturun:

   ```bash
   npm install
   cp .env.example .env
   ```

3. `.env` içindeki `DATABASE_URL` değerini PostgreSQL bilgilerinizle,
   `JWT_SECRET` değerini de uzun ve rastgele bir değerle güncelleyin.

4. Prisma istemcisini üretin, migration'ları uygulayın ve örnek verileri ekleyin:

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. İki ayrı terminalde API ve masaüstü arayüzünü başlatın:

   ```bash
   npm run dev:api
   npm run dev:desktop
   ```

   API varsayılan olarak `http://localhost:3000`, Vite arayüzü ise
   `http://localhost:5173` adresinde çalışır.

### Docker ile kurulum

Docker Desktop çalışırken PostgreSQL ve API'yi tek komutla başlatabilirsiniz:

```bash
docker compose up --build
```

Bu yapılandırmada PostgreSQL host makinede `5433`, API ise `3000` portunu kullanır.
İlk açılışta migration'lar uygulanır. Durdurmak için:

```bash
docker compose down
```

`docker compose down -v` yerel veritabanı volume'unu da siler.

### Seed kullanıcıları

`npm run db:seed` geliştirme için aşağıdaki kullanıcıları oluşturur. Parolaları
`.env` içindeki `SEED_*_PASSWORD` değişkenleriyle değiştirebilirsiniz.

| Kullanıcı | Varsayılan parola | Rol |
|-----------|-------------------|-----|
| `admin` | `admin123` | Admin |
| `patron` | `patron123` | Patron |
| `garson` | `garson123` | Garson |
| `mutfak` | `mutfak123` | Mutfak |
| `kasa` | `kasa123` | Kasa |

Bu parolaları gerçek veya paylaşılan ortamlarda kullanmayın.

---

## Ne İşe Yarar?

1. **Garson** masadan siparişi alır, sisteme girer.
2. **Sipariş** mutfak ekranına anında düşer (WebSocket).
3. **Mutfak** sipariş kalemlerinin hazırlık durumunu günceller.
4. **Kasa** adisyonu görüntüler, ürün ekleyebilir, nakit/kart/bölünmüş ödeme alır.
5. **Patron** gün sonunda günlük rapor alır, ciro ve en çok satanları görür.
6. **Çevrimdışı** çalışma: internet yokken yerel SQLite ile devam eder, internet geldiğinde merkezi PostgreSQL ile senkronize olur.

---

## Roller

| Rol | Yetkiler |
|-----|----------|
| **Garson** | Masa görüntüleme, adisyon açma, sipariş ekleme, ikram tanımlama, mutfak durumu takibi |
| **Mutfak** | Bekleyen siparişleri görme, hazırlamaya alma, hazır işaretleme |
| **Kasa** | Açık adisyonları görme, ödeme alma (nakit/kart/bölünmüş), adisyon kapatma |
| **Patron** | Ürün/kategori/masa/kullanıcı yönetimi, günlük rapor, ciro takibi, ikram raporu |
| **Admin** | Tüm yetkilere sahip sistem yöneticisi |

---

## Teknoloji Yığını

### Masaüstü Uygulama

| Teknoloji | Kullanım |
|-----------|----------|
| **TypeScript** | Tüm proje genelinde tip güvenliği |
| **React** | Kullanıcı arayüzü |
| **Vite** | Hızlı geliştirme sunucusu ve bundler |
| **Tauri** | Masaüstü uygulaması (Windows/Linux) |

### Backend API

| Teknoloji | Kullanım |
|-----------|----------|
| **Node.js** | Çalışma zamanı |
| **Fastify** | HTTP framework |
| **Zod** | Veri doğrulama (tek kaynak: `packages/shared`) |
| **JWT** | Token bazlı kimlik doğrulama |
| **Argon2id** | Güvenli şifre hashleme |
| **@fastify/websocket** | Mutfak ekranı gerçek zamanlı bildirimleri |

### Veritabanı

| Teknoloji | Kullanım |
|-----------|----------|
| **PostgreSQL** | Merkezi/çevrimiçi veritabanı |
| **SQLite** | Masaüstü/çevrimdışı yerel veritabanı — *planlanan* |
| **Prisma** | ORM, migration ve seed yönetimi |

---

## Mimari

```
React + Tauri (Masaüstü)
      ↓
Fastify Routes / HTTP
      ↓
Application Use Cases          ← İş akışı koordinasyonu
      ↓
Domain Entities + Rules        ← Saf iş kuralları (DB bağımsız)
      ↓
Repository Interfaces          ← Soyut veri erişim sözleşmeleri
      ↑
Prisma Adapter                 ← Somut PostgreSQL/SQLite implementasyonu
      ↓
PostgreSQL / SQLite
```

**Pragmatik Clean Architecture** kullanılıyor. Domain ve use-case katmanları veritabanından bağımsız. Bu sayede:

- İş kuralları tek yerde yaşıyor, test edilebilir.
- Aynı use-case hem PostgreSQL hem SQLite adapter'ıyla çalışabiliyor.
- Route/HTTP katmanı sadece validasyon ve dönüşüm yapıyor.

### Çevrimdışı Mimari

```
                    ┌── PostgreSQL Repository (Çevrimiçi)
Application Use Case┤
                    └── SQLite Repository (Çevrimdışı)
                              ↓
                        Outbox Tablosu
                              ↓
                        POST /sync/batch → Sunucu
```

---

## Proje Yapısı

```
restraunt-adisyon/
├── apps/
│   ├── api/                     # Fastify backend
│   │   └── src/
│   │       ├── domain/          # Saf iş kuralları (entity'ler)
│   │       │   ├── catalog/     #   Product, Category
│   │       │   ├── orders/      #   Order, OrderItem
│   │       │   ├── payments/    #   Payment
│   │       │   ├── tables/      #   DiningTable
│   │       │   ├── users/       #   User
│   │       │   └── shared/      #   DecimalValue, DomainError
│   │       ├── application/     # Use-case katmanı
│   │       │   ├── catalog/     #   CatalogUseCases
│   │       │   ├── orders/      #   OrderUseCases
│   │       │   ├── payments/    #   PaymentUseCases
│   │       │   ├── reports/     #   ReportUseCases
│   │       │   ├── tables/      #   TableUseCases
│   │       │   └── users/       #   UserUseCases
│   │       ├── interfaces/      # Repository sözleşmeleri
│   │       ├── infrastructure/  # Prisma adapter'ları
│   │       ├── shared/          # Ortak yardımcılar (error handler)
│   │       ├── catalog/         # HTTP route'ları
│   │       ├── orders/          # HTTP route'ları
│   │       ├── payments/        # HTTP route'ları
│   │       ├── reports/         # HTTP route'ları
│   │       ├── tables/          # HTTP route'ları
│   │       ├── users/           # HTTP route'ları
│   │       ├── authentication/  # Auth route + middleware
│   │       ├── composition.ts   # Dependency injection root
│   │       └── app.ts           # Fastify uygulama kurulumu
│   └── desktop/                 # React + Vite frontend
│       └── src/
├── packages/
│   └── shared/                  # Ortak Zod şemaları ve tipler
├── prisma/
│   ├── schema.prisma            # PostgreSQL şeması
│   └── seed.ts                  # Başlangıç verileri
└── package.json                 # npm workspace root
```

---

## Temel İş Kuralları

- Ödenmiş sipariş değiştirilemez.
- İptal edilmiş siparişe ödeme alınamaz.
- Ödeme tutarı kalan borçtan fazla olamaz.
- Sipariş oluşturulurken ürün fiyatı snapshot olarak saklanır.
- Hazırlanmaya başlayan sipariş kalemi düzenlenemez.
- Servis edilen veya iptal edilen kalem tekrar iptal edilemez.
- İkram edilen kalem listelenen tutarı korur ama tahsilattan düşer.
- Aktif adisyonu olan masaya ikinci aktif adisyon açılamaz.
- Adisyon ödendiğinde masa tekrar AVAILABLE olur.
- Aktif ürünü olan kategori pasif edilemez.
- Pasif kategorideki ürün aktif edilemez.
- Kullanıcı kendi hesabını devre dışı bırakamaz.
- Şifreler hiçbir zaman düz metin saklanmaz (Argon2id).

---

## API Kapsamı

### Kimlik Doğrulama

```
POST /auth/login
GET  /auth/me
```

### Kategoriler

```
GET   /categories
POST  /categories
PATCH /categories/:id
```

### Ürünler

```
GET   /products
POST  /products
PATCH /products/:id
```

### Masalar

```
GET   /tables
PATCH /tables/:id/status
```

### Siparişler

```
POST   /orders
GET    /orders/:id
POST   /orders/:id/items
PATCH  /orders/:id/items/:itemId
POST   /orders/:id/items/:itemId/cancel
PATCH  /orders/:id/items/:itemId/cancel
DELETE /orders/:id/items/:itemId
PATCH  /orders/:id/items/:itemId/status
```

### Ödemeler

```
POST /payments
POST /orders/:id/pay
GET  /orders/:id/payments
```

### Raporlar

```
GET  /reports/daily?date=YYYY-MM-DD
POST /reports/daily?date=YYYY-MM-DD
```

### Kullanıcı Yönetimi

```
GET   /users
POST  /users
PATCH /users/:id
POST  /users/:id/deactivate
```

---

## Geliştirme Komutları

```bash
npm install                          # Bağımlılıkları kur
npm run dev:api                      # API geliştirme sunucusu
npm run dev:desktop                  # Frontend geliştirme sunucusu
npm run typecheck                    # TypeScript tip kontrolü
npm run build                        # Tüm workspace'leri derle
npm run db:validate                  # Prisma şema doğrulama
npm run db:migrate -- --name isim    # Yeni migration oluştur
npm run db:seed                      # Başlangıç verilerini yükle
npm run db:studio                    # Prisma Studio (DB görüntüleyici)
npm run test --workspace=@adisyon/api # API testleri
npm run tauri:build                  # Tauri masaüstü paketi
```

---

## Ortam Değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayıp düzenleyin:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/adisyon"
JWT_SECRET="güçlü-ve-rastgele-bir-secret"
PORT=3000
```

`DATABASE_TYPE`, `API_HOST` ve `VITE_API_URL` değişkenleri için kökteki
[.env.example](./.env.example) dosyasını referans alın. Çevrimdışı SQLite modu
için API'nin `DATABASE_TYPE` değerini `sqlite` yapın; senkronizasyon kullanılıyorsa
`CENTRAL_SERVER_URL` ve `SYNC_SECRET` değerlerini ayrıca tanımlayın.

## GitHub'a gönderim öncesi kontrol listesi

- `.env`, veritabanı dosyaları, `node_modules` ve derleme çıktıları commit edilmedi.
- `npm run typecheck` başarılı.
- `npm run build` başarılı.
- `npm run db:validate` başarılı.
- README'deki kurulum adımları temiz bir klasörde takip edildi.

