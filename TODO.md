# Yapılacaklar Listesi

> Son güncelleme: Eylül 2026

---

## FAZ 1 — Mimari Sağlamlaştırma ✅

- [x] Catalog modülünü repository/use-case yapısına taşımak
- [x] User modülünü repository/use-case yapısına taşımak
- [x] Ödeme endpoint'lerini konsolide etmek (3→2)
- [x] Standart hata yönetimi (`createErrorHandler`) oluşturmak
- [x] Composition root güncelleme
- [x] TypeScript typecheck ve build doğrulaması
- [x] Audit log altyapısı (tablo + decorator)
- [x] Sipariş listesi endpoint'i (`GET /orders`)
- [x] Mutfak ekranı endpoint'i (`GET /orders/kitchen`)


---

## FAZ 2 — Walking Skeleton (Uçtan Uca İlk Dilim)

### Frontend Altyapısı

- [x] `react-router-dom` ile routing kurulumu
- [x] `@tanstack/react-query` ile sunucu state yönetimi
- [x] API istemcisi (JWT header, token refresh)
- [x] Rol bazlı route koruma (`ProtectedRoute`)
- [x] Toast/bildirim sistemi
- [x] Loading ve error state bileşenleri

### Login Ekranı

- [x] Login formu (kullanıcı adı + şifre)
- [x] JWT token alma ve saklama
- [x] Role göre yönlendirme

### Garson Ekranı (Minimal)

- [x] Masa planı (grid, durum renkleri)
- [x] Kategori tabları
- [x] Ürün seçim grid'i
- [x] Sipariş sepeti (ekle, adet, not)
- [x] "Mutfağa Gönder" → `POST /orders`

### Mutfak Ekranı (WebSocket)

- [x] `@fastify/websocket` backend gateway
- [x] Kanban board (PENDING → PREPARING → READY)
- [x] Gerçek zamanlı WebSocket güncellemesi
- [ ] Yeni sipariş ses bildirimi

### Kasa Ekranı (Minimal)

- [x] Açık adisyon listesi
- [x] Adisyon detayı görüntüleme
- [x] Nakit / kart ödeme alma
- [x] Adisyon kapatma

---

## FAZ 3 — Frontend Tamamlama

### Garson

- [x] İkram seçimi ve nedeni
- [x] Sipariş notu
- [x] Açık adisyonu düzenleme
- [x] Mutfak durum takibi

### Kasa

- [x] Bölünmüş ödeme
- [x] Ödeme geçmişi
- [x] Masa + sipariş arama
- [x] İkram görünümü

### Patron

- [x] Günlük ciro kartları (nakit/kart dağılımı)
- [x] En çok satılan ürünler
- [x] İkram raporu
- [x] Günlük/Z raporu görüntüleme ve oluşturma

### Yönetim (Patron + Admin)

- [x] Ürün ve kategori CRUD ekranları
- [x] Kullanıcı yönetimi ekranı
- [x] Masa yönetimi ekranı

---

## FAZ 4 — Operasyonel Özellikler

- [x] Kasa açılış/kapanış oturumu
- [x] Kasa farkı hesaplama
- [x] Ödeme iadesi endpoint'i
- [x] İptal/iadelerde yetki kontrolü
- [x] Paket/gel-al sipariş desteği
- [ ] Printer interface tanımı (ESC/POS)

---

## FAZ 5 — Tauri Masaüstü Entegrasyonu

- [ ] Tauri 2.x proje kurulumu
- [ ] React frontend'i Tauri shell'e bağlama
- [ ] API adresi environment config
- [ ] Çevrimdışı/çevrimiçi durum göstergesi
- [ ] Windows/Linux paketleme
- [ ] Uygulama güncelleme mekanizması

---

## FAZ 6 — Çevrimdışı Sistem

- [ ] SQLite schema spike (Faz 1 sonunda başlatılacak)
- [ ] `prisma/schema.sqlite.prisma` oluşturma
- [ ] Enum → string, Decimal → Float/String mapping
- [ ] SQLite repository adapter'ları
- [ ] Outbox tablosu ve domain operation kayıtları
- [ ] `POST /sync/batch` senkronizasyon API'si
- [ ] İdempotency key mekanizması
- [ ] Çakışma çözümleme (sipariş: işlem bazlı, ödeme: reject, catalog: server-wins)
- [ ] Sync durumu UI göstergesi
- [ ] Başarısız sync kayıtları yönetim ekranı

---

## FAZ 7 — Yayına Hazırlık

- [ ] JWT refresh token + httpOnly cookie
- [ ] Rate limit
- [ ] Login denemesi sınırı
- [ ] CORS üretim kısıtlaması
- [ ] Raporlama query katmanı (SQL view bazlı)
- [ ] Sentry entegrasyonu
- [ ] Structured logging
- [ ] PostgreSQL otomatik yedekleme
- [ ] Kullanıcı ve kurulum dokümantasyonu

---

## Kapsam Dışı (v1)

- Masa birleştirme / masa değiştirme
- İskonto altyapısı
- Stok / reçete / gramaj / tedarikçi
- Çoklu şube
- Mobil garson uygulaması
- Online sipariş / yemek platformu entegrasyonları
- Personel vardiya yönetimi
- ÖKC/GİB entegrasyonu (sistem resmiyete taşınmayacak)
