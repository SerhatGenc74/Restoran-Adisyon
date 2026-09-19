# Çorbacı Adisyon Sistemi

## 1. Projenin amacı

Bu projenin amacı, çorbacı ve benzeri restoranlarda masa, sipariş, mutfak, kasa ve gün sonu işlemlerini tek bir uygulama üzerinden yönetmektir.

Sistem özellikle hızlı servis akışına uygun tasarlanacaktır:

1. Garson masadan siparişi alır.
2. Sipariş mutfak ekranına düşer.
3. Mutfak sipariş kalemlerinin hazırlık durumunu günceller.
4. Kasa tüm adisyonu görüntüler, ürün ekleyebilir ve ödeme alır.
5. Patron gün sonunda Z raporu alır.
6. İnternet yokken uygulama yerel SQLite veritabanıyla çalışır.
7. İnternet geldiğinde yerel kayıtlar merkezi PostgreSQL veritabanıyla senkronize edilir.

## 2. Hedef kullanıcılar ve roller

### Garson

- Masaları görüntüleme
- Yeni adisyon açma
- Siparişe ürün ekleme
- Sipariş kalemi notu girme
- İkram tanımlama
- Sipariş ve mutfak durumunu takip etme

### Mutfak

- Bekleyen siparişleri görme
- Siparişi hazırlamaya alma
- Hazır olarak işaretleme
- Servis edildi durumunu görme
- Gerekirse ürün iptalini takip etme

### Kasa

- Tüm açık adisyonları görüntüleme
- Adisyona yiyecek/içecek ekleme
- Nakit, kart veya diğer ödeme alma
- Bölünmüş ödeme alma
- Adisyon kapatma
- Ödeme ve kalan tutarı görüntüleme

### Patron

- Ürün ve kategori yönetimi
- Kullanıcı yönetimi
- Masa yönetimi
- Günlük/Z raporu alma
- Nakit ve kart cirosunu görme
- En çok satılan ürünleri görme
- İkram toplamlarını inceleme

### Sistem yöneticisi

- Tüm yönetim işlemleri
- Kullanıcı ve yetki yönetimi
- Sistem ayarları
- Teknik ve senkronizasyon kontrolleri

## 3. Teknoloji yığını

### Uygulama

- TypeScript
- React
- Tauri
- Vite

### Backend

- Node.js
- Fastify
- Zod
- JWT
- Argon2id

### Veritabanı

- PostgreSQL: Merkezi/çevrimiçi veritabanı
- SQLite: Masaüstü/çevrimdışı veritabanı
- Prisma: ORM ve migration yönetimi

### Mimari

- Pragmatik Clean Architecture
- Domain entities ve business rules
- Application use-case katmanı
- Repository interface’leri
- Prisma infrastructure adapter’ları

## 4. Mevcut proje durumu

### Tamamlananlar

- [x] npm workspace tabanlı proje yapısı
- [x] Fastify API başlangıç uygulaması
- [x] React/Vite masaüstü frontend başlangıcı
- [x] Ortak `packages/shared` paketi
- [x] TypeScript yapılandırması
- [x] PostgreSQL bağlantısı
- [x] Prisma migration
- [x] PostgreSQL tablolarının oluşturulması
- [x] Seed sistemi
- [x] Geliştirme kullanıcıları
- [x] Örnek kategori, ürün ve masalar
- [x] Argon2id şifre hashleme
- [x] JWT login API’si
- [x] `/auth/me` endpoint’i
- [x] Rol bazlı yetkilendirme middleware’i
- [x] Ürün API’leri
- [x] Kategori API’leri
- [x] Masa API’leri
- [x] Sipariş API’leri
- [x] Sipariş kalemi API’leri
- [x] Mutfak durum geçişleri
- [x] Ödeme API’leri
- [x] Bölünmüş ödeme altyapısı
- [x] Günlük/Z raporu API’si
- [x] Kullanıcı yönetimi API’si
- [x] İkram takibi
- [x] Domain entity sınıfları
- [x] Order, OrderItem, Payment ve DiningTable entity’leri
- [x] Prisma-to-domain mapper’ları
- [x] Entity restoration metotları
- [x] Sipariş, ödeme, rapor ve masa use-case’leri
- [x] Repository interface’leri
- [x] Prisma repository adapter’ları
- [x] Dependency injection/composition root
- [x] TypeScript typecheck
- [x] API ve frontend build doğrulaması
- [x] PostgreSQL üzerinde API smoke testleri

## 5. Mevcut API kapsamı

### Kimlik doğrulama

```text
POST /auth/login
GET  /auth/me
```

### Kategoriler

```text
GET   /categories
POST  /categories
PATCH /categories/:id
```

### Ürünler

```text
GET   /products
POST  /products
PATCH /products/:id
```

### Masalar

```text
GET   /tables
PATCH /tables/:id/status
```

### Siparişler

```text
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

```text
POST /payments
POST /orders/:id/payments
POST /orders/:id/pay
GET  /orders/:id/payments
```

### Raporlar

```text
GET  /reports/daily?date=YYYY-MM-DD
POST /reports/daily?date=YYYY-MM-DD
```

### Kullanıcı yönetimi

```text
GET   /users
POST  /users
PATCH /users/:id
POST  /users/:id/deactivate
```

## 6. İş kuralları

- Ödenmiş sipariş değiştirilemez.
- İptal edilmiş siparişe ödeme alınamaz.
- Sipariş tamamen ödenmeden `PAID` durumuna geçemez.
- Ödeme tutarı kalan borçtan fazla olamaz.
- Nakit ve kart ödemeleri ayrı raporlanır.
- Sipariş oluşturulurken ürünün güncel fiyatı backend tarafından alınır.
- Sipariş kaleminde ürün fiyatı snapshot olarak saklanır.
- Hazırlanmaya başlayan sipariş kalemi düzenlenemez.
- Servis edilen veya iptal edilen kalem tekrar iptal edilemez.
- İkram edilen kalem normal listelenen tutarı korur fakat tahsilat toplamından düşer.
- İkram nedeni tutulur.
- Aktif adisyon bulunan masaya ikinci aktif adisyon açılamaz.
- Adisyon ödendiğinde masa tekrar `AVAILABLE` olur.
- Mutfak durum geçişleri `kitchen_events` tablosunda izlenir.
- Raporlarda iptal ve iade ödemeleri gelir olarak sayılmaz.
- Şifreler hiçbir zaman düz metin saklanmaz.

## 7. Öncelikli yapılacaklar

### Mimari ve backend

- [x] Catalog modüllerini repository/use-case yapısına taşımak
- [x] Kullanıcı yönetimini repository/use-case yapısına taşımak
- [x] Authentication servisinin repository portlarını ayırmak
- [x] Prisma mapper’larında kalan `unknown` dönüşlerini güçlü tiplere taşımak
- [ ] Application DTO’larını HTTP DTO’larından ayırmak
- [x] Ortak hata/exception mapping yapısı oluşturmak
- [x] API response formatını standartlaştırmak
- [ ] Pagination ve filtreleme desteği eklemek
- [x] Sipariş listesi endpoint’i eklemek
- [x] Mutfak ekranı için sipariş listesi endpoint’i eklemek

### Kasa ve operasyon

- [x] Kasa açılış oturumu oluşturmak
- [x] Kasa kapanış işlemi eklemek
- [x] Açılış nakdi, beklenen nakit ve sayılan nakit alanlarını eklemek
- [x] Kasa farkını hesaplamak
- [x] Ödeme iadesi endpoint’i eklemek
- [x] İptal/iadelerde yetki kontrolü eklemek
- [x] Adisyon bölme desteği eklemek
- [x] Masa birleştirme desteği eklemek
- [x] Masa değiştirme desteği eklemek
- [x] İskonto/indirim altyapısı eklemek
- [x] Paket ve gel-al siparişlerini desteklemek

### Test ve kalite

- [x] Domain entity birim testleri
- [x] Sipariş use-case testleri
- [x] Ödeme use-case testleri
- [x] Masa use-case testleri
- [x] Rapor use-case testleri
- [x] Yetki middleware testleri
- [ ] API integration testleri
- [x] İkram hesaplama testleri
- [x] Bölünmüş ödeme testleri
- [x] Eş zamanlı ödeme testleri
- [x] Geçersiz mutfak geçişi testleri
- [ ] Test verilerinin otomatik temizlenmesi

## 8. Frontend yapılacaklar

### Ortak arayüz

- [ ] Login ekranı
- [ ] Rol bazlı yönlendirme
- [ ] Token/session yönetimi
- [ ] Ortak layout
- [ ] Kullanıcı menüsü
- [ ] Bildirim/toast sistemi
- [ ] Hata ekranları
- [ ] Loading ve empty state tasarımları

### Garson ekranı

- [ ] Masa planı
- [ ] Masa durum renkleri
- [ ] Kategori ve ürün seçimi
- [ ] Sipariş sepeti
- [ ] Ürün adedi değiştirme
- [ ] Not ekleme
- [ ] İkram seçimi
- [ ] Açık adisyon görüntüleme
- [ ] Siparişi mutfağa gönderme

### Mutfak ekranı

- [ ] Bekleyen siparişler
- [ ] Hazırlanıyor kolonu
- [ ] Hazır siparişler
- [ ] Servis edildi durumu
- [ ] Sipariş önceliği
- [ ] Yeni sipariş sesi
- [ ] Otomatik yenileme veya WebSocket
- [ ] Ürün ve sipariş notlarının gösterimi

### Kasa ekranı

- [ ] Açık adisyon listesi
- [ ] Masa ve sipariş arama
- [ ] Adisyona ürün ekleme
- [ ] Nakit ödeme
- [ ] Kart ödeme
- [ ] Bölünmüş ödeme
- [ ] İkram/indirim görünümü
- [ ] Hesap kapatma
- [ ] Ödeme geçmişi

### Patron ekranı

- [x] Günlük ciro kartları
- [x] Nakit/kart dağılımı
- [x] En çok satılan ürünler
- [x] İkram raporu
- [x] Günlük/Z raporu
- [x] Ürün yönetimi
- [x] Kategori yönetimi
- [x] Kullanıcı yönetimi
- [x] Masa yönetimi

## 9. Çevrimdışı çalışma ve senkronizasyon

### SQLite hazırlığı

- [ ] SQLite için ayrı Prisma schema oluşturmak
- [ ] PostgreSQL/SQLite enum uyumluluğunu kontrol etmek
- [ ] Decimal alanlarının SQLite karşılığını belirlemek
- [ ] UUID üretiminin cihaz tarafında çalışmasını sağlamak
- [ ] SQLite migration akışını oluşturmak
- [ ] SQLite seed akışını oluşturmak
- [ ] Repository portlarının iki veritabanıyla uyumunu doğrulamak

### Outbox/senkronizasyon

- [ ] Yerel işlem outbox tablosu eklemek
- [ ] İşlem türlerini tanımlamak
- [ ] Senkronizasyon durumlarını tanımlamak
- [ ] Retry/backoff mekanizması eklemek
- [ ] İnternet bağlantısı kontrolü eklemek
- [ ] Sunucuya batch senkronizasyon endpoint’i eklemek
- [ ] Idempotency anahtarı eklemek
- [ ] Çakışma çözümleme stratejisi belirlemek
- [ ] Başarılı işlemleri işaretlemek
- [ ] Başarısız işlemleri kullanıcıya göstermek
- [ ] Senkronizasyon geçmişi ve hata log’u eklemek

### Senkronizasyon için önerilen kurallar

- UUID tüm cihazlarda merkezi olmalı.
- Aynı işlem birden fazla kez gönderilse bile ikinci kez uygulanmamalı.
- Sipariş kalemleri doğrudan üzerine yazılmak yerine işlem bazlı senkronize edilmeli.
- Ödeme ve adisyon kapatma işlemleri daha yüksek öncelikli olmalı.
- Çakışan ödemeler otomatik sessizce birleştirilmemeli.
- Kritik çakışmalar patron/kasa ekranında görünür olmalı.

## 10. Tauri masaüstü uygulaması

- [ ] Tauri projesini oluşturmak
- [ ] React frontend’i Tauri ile bağlamak
- [ ] API adresi ve çalışma modu ayarları eklemek
- [ ] Çevrimdışı/çevrimiçi durum göstergesi eklemek
- [ ] Yerel SQLite bağlantısını eklemek
- [ ] Termal yazıcı desteğini araştırmak
- [ ] Fiş yazdırma akışını eklemek
- [ ] Windows/Linux paketleme
- [ ] Uygulama güncelleme mekanizması
- [ ] Yerel log ve hata raporlama

## 11. Raporlama kapsamı

### Günlük rapor

- [ ] Toplam ciro
- [ ] Nakit ciro
- [ ] Kart ciro
- [ ] Diğer ödeme türleri
- [ ] İkram toplamı
- [ ] İndirim toplamı
- [ ] Ödenen adisyon sayısı
- [ ] Ortalama adisyon tutarı
- [ ] En çok satılan yiyecekler
- [ ] En çok satılan içecekler
- [ ] İptal edilen ürünler
- [ ] Saatlik satış dağılımı

### İleri raporlar

- [ ] Garson bazlı satış
- [ ] Ürün kârlılığı
- [ ] Gün/hafta/ay karşılaştırması
- [ ] En yoğun servis saatleri
- [ ] İkram veren kullanıcı raporu
- [ ] Kasa fark raporu
- [ ] Stok tüketim raporu

## 12. Güvenlik yapılacakları

- [ ] Üretimde güçlü ve rastgele JWT secret kullanmak
- [ ] Refresh token veya güvenli session stratejisi eklemek
- [ ] Token süresi ve yenileme politikası belirlemek
- [ ] Rate limit eklemek
- [ ] Login denemelerini sınırlamak
- [ ] Audit log eklemek
- [ ] Kritik işlemlerde kullanıcı ve zaman bilgisi tutmak
- [ ] İptal/ikram/iade işlemlerine sebep zorunluluğu eklemek
- [ ] CORS ayarlarını üretim ortamına göre daraltmak
- [ ] Hassas verileri loglamamak
- [ ] PostgreSQL kullanıcı yetkilerini minimum seviyeye indirmek
- [ ] Düzenli veritabanı yedeği almak

## 13. Eklenebilecek özellik önerileri

### Kısa vadede faydalı

- [ ] Termal fiş yazdırma
- [ ] Mutfak sipariş sesi
- [ ] Hızlı ürün arama
- [ ] Sık kullanılan ürünler
- [ ] Son siparişi tekrarlama
- [ ] Garson notları
- [ ] Günlük vardiya açma/kapatma

### Orta vadede faydalı

- [ ] Stok takibi
- [ ] Kritik stok uyarısı
- [ ] Reçete/gramaj takibi
- [ ] Tedarikçi yönetimi
- [ ] Personel vardiya yönetimi
- [ ] QR menü
- [ ] Paket servis ekranı
- [ ] Müşteri cari hesabı

### Uzun vadede faydalı

- [ ] Çoklu şube
- [ ] Merkezi ürün ve fiyat yönetimi
- [ ] Online sipariş entegrasyonu
- [ ] Yemek platformu entegrasyonları
- [ ] Gelişmiş kârlılık raporları
- [ ] Mobil garson uygulaması
- [ ] Yönetim paneli

## 14. Önerilen uygulama sırası

### Faz 1 — Temel backend

- [x] Veritabanı şeması
- [x] Migration
- [x] Seed
- [x] Authentication
- [x] Yetkilendirme
- [x] Catalog API’leri
- [x] Masa API’leri
- [x] Sipariş API’leri
- [x] Ödeme API’leri
- [x] Rapor API’leri

### Faz 2 — Mimari sağlamlaştırma

- [x] Domain entity’leri
- [x] Use-case katmanı
- [x] Repository interface’leri
- [x] Prisma adapter’ları
- [x] Persistence mapper’ları
- [ ] Catalog ve kullanıcı modüllerini aynı mimariye taşımak
- [ ] Domain/use-case testleri
- [ ] Standart hata yönetimi

### Faz 3 — Frontend

- [x] Login
- [x] Rol bazlı ekran yönlendirme
- [x] Garson ekranı
- [x] Mutfak ekranı
- [x] Kasa ekranı
- [x] Patron rapor ekranı

### Faz 4 — Masaüstü ve operasyon

- [ ] Tauri entegrasyonu
- [ ] Termal yazıcı
- [ ] Kasa açılış/kapanış
- [ ] İade ve iptal
- [ ] Adisyon bölme/birleştirme

### Faz 5 — Çevrimdışı sistem

- [ ] SQLite schema
- [ ] Yerel repository
- [ ] Outbox
- [ ] Senkronizasyon API’si
- [ ] Çakışma çözümü
- [ ] Çevrimdışı UI göstergeleri

### Faz 6 — Yayına hazırlık

- [ ] Güvenlik sertleştirmesi
- [ ] Yedekleme
- [ ] Monitoring
- [ ] Error tracking
- [ ] Paketleme
- [ ] Kullanıcı dokümantasyonu
- [ ] Kurulum dokümantasyonu

## 15. Başarı kriterleri

Proje ilk üretim sürümü için şu şartları sağlamalıdır:

- Garson internet olmadan sipariş girebilmelidir.
- Sipariş kalemleri mutfak ekranında doğru sırayla görünmelidir.
- Kasa nakit, kart ve bölünmüş ödeme alabilmelidir.
- Ödenen adisyon masa durumunu otomatik güncellemelidir.
- İkramlar günlük raporda ayrı gösterilmelidir.
- Patron nakit/kart cirosunu ve en çok satan ürünleri görebilmelidir.
- Aynı sipariş veya ödeme senkronizasyon sırasında iki kez uygulanmamalıdır.
- Rolü olmayan kullanıcı kritik işlemlere erişememelidir.
- Veritabanı bağlantısı geçici olarak kesilse bile masaüstü uygulaması temel işlemleri sürdürebilmelidir.
- Kritik kullanıcı işlemleri denetlenebilir olmalıdır.

## 16. Geliştirme komutları

```bash
npm install
npm run dev:api
npm run dev:desktop
npm run typecheck
npm run build
npm run db:validate
npm run db:migrate -- --name migration_adi
npm run db:seed
npm run db:studio
```

## 17. Güncel mimari özeti

```text
React + Tauri
      ↓
Fastify Routes / HTTP
      ↓
Application Use Cases
      ↓
Domain Entities + Domain Rules
      ↓
Repository Interfaces
      ↑
Prisma PostgreSQL Adapter
      ↓
PostgreSQL
```

Çevrimdışı aşama tamamlandığında aynı application katmanı şu iki adapter üzerinden çalışacaktır:

```text
                    ┌── PostgreSQL Repository
Application Use Case┤
                    └── SQLite Repository
```

Bu yapı sayesinde iş kuralları veritabanına veya kullanıcı arayüzüne bağımlı kalmadan korunabilir.
