# Riskler ve Tavsiyeler

Geliştirme sürecinde dikkat edilmesi gereken riskler, eklenmesini tavsiye edilen özellikler ve mimari kararlar.

> Son güncelleme: Eylül 2026

---

## 🔴 Yüksek Riskler

### 1. SQLite / PostgreSQL Uyumsuzluğu

**Risk:** Prisma tek bir şemada iki provider'ı desteklemiyor. Enum'lar, Decimal tipler ve UUID üretimi iki veritabanında farklı çalışıyor.

**Etki:** Çevrimdışı sistem çalışmayabilir veya veri bozulması yaşanabilir.

**Azaltma:**
- Faz 1 tamamlandıktan hemen sonra tek bir entity (DiningTable) üzerinde SQLite spike yapılacak.
- `prisma/schema.sqlite.prisma` ayrı şema olacak.
- Enum → string mapping, Decimal → Float/String kararı spike'ta verilecek.
- UUID üretimi `crypto.randomUUID()` ile test edilecek.
- Repository interface'lerinin her iki adapter'ı da soyutladığı doğrulanacak.

**Durum:** ⏳ Spike henüz yapılmadı.

---

### 2. Outbox / Senkronizasyon Çakışmaları

**Risk:** Birden fazla cihaz aynı adisyona eşzamanlı işlem yaparsa (iki garson aynı masaya sipariş, iki kasa aynı adisyona ödeme) veri tutarsızlığı oluşabilir.

**Etki:** Çift ödeme, kayıp sipariş, tutarsız raporlar.

**Azaltma:**
- Outbox kaydı entity snapshot değil, **domain operation** olacak (overwrite yok).
- Her outbox kaydı client-generated UUID ile idempotency key taşıyacak.
- Çakışan ödeme sessizce birleştirilmeyecek — sunucu reddedecek, kullanıcıya gösterilecek.
- Sipariş kalemleri işlem bazlı senkronize edilecek (son-yazan-kazanır yok).
- Ödeme ve adisyon kapatma işlemleri daha yüksek sync önceliğine sahip olacak.

**Durum:** ⏳ Strateji belgelendi, implementasyon Faz 6'da.

---

### 3. İki Pattern Paralel Büyümesi

**Risk:** Catalog ve User modülleri diğer modüllerden farklı bir pattern'de kalıp üzerine yeni feature eklendikçe refaktör maliyeti katlanır.

**Etki:** Kod tutarsızlığı, tekrar eden bug'lar, yeni geliştiriciler için kafa karışıklığı.

**Azaltma:** ✅ **Çözüldü** — Faz 1'de tüm modüller aynı mimariye (domain → use-case → repository → adapter) taşındı.

**Durum:** ✅ Tamamlandı.

---

## 🟡 Orta Riskler

### 4. Frontend State Karmaşıklığı

**Risk:** Garson, mutfak, kasa ve patron ekranları farklı veri ihtiyaçlarına sahip. Düzgün yönetilmezse prop drilling, stale data ve gereksiz re-render sorunları çıkar.

**Azaltma:**
- `@tanstack/react-query` ile sunucu state'i normalize edilecek.
- Client state minimal tutulacak (sadece UI state: modal açık/kapalı, seçili tab).
- WebSocket event'leri query cache invalidation ile entegre edilecek.

**Durum:** ⏳ Faz 2'de uygulanacak.

---

### 5. WebSocket Bağlantı Yönetimi

**Risk:** Mutfak ekranı sürekli açık kalacak. Bağlantı kopmaları, reconnect, ve birden fazla mutfak istemcisi durumları ele alınmalı.

**Azaltma:**
- `@fastify/websocket` kullanılacak.
- Client tarafında otomatik reconnect + exponential backoff.
- Reconnect sonrası son durumun HTTP ile çekilmesi (WebSocket sadece delta için).
- Aynı event altyapısı ileride sync bildirimlerine de hizmet edecek şekilde tasarlanacak.

**Durum:** ⏳ Faz 2'de uygulanacak.

---

### 6. Audit Log'un Sonradan Eklenmesi

**Risk:** Audit log cross-cutting bir concern. Tüm use-case'lere sonradan tek tek eklemek pahalı ve unutulmaya açık.

**Azaltma:**
- Use-case execution'ını saran bir decorator/wrapper mekanizması ile temelden kurulacak.
- `createOrder`, `completePayment`, `cancelOrderItem`, `updateUser` gibi kritik aksiyonlar otomatik loglanacak.
- Faz 1'e taşındı (orijinal planda Faz 6'daydı).

**Durum:** ⏳ Henüz implementasyona başlanmadı.

---

## 🟢 Düşük Riskler

### 7. WebSocket Ölçekleme

**Risk:** Çok cihaz bağlanırsa tek sunucu WebSocket yükünü kaldıramayabilir.

**Azaltma:** v1'de tek lokasyon/sunucu varsayımı geçerli. Pub-sub ayrımı yapıldıysa ileride Redis Pub/Sub eklenebilir. Çorbacı senaryosunda 5-10 cihaz bekleniyor — risk düşük.

---

## 💡 Tavsiyeler

### Kesinlikle Yapılması Gerekenler

| # | Tavsiye | Neden | Planlanan Faz |
|---|---------|-------|---------------|
| 1 | **Online API'de de idempotency key kullan** | Çift tıklama + yavaş network = çift işlem riski. Sync için zaten bu altyapıyı kuracaksınız; aynı mekanizmayı ödeme oluşturma ve sipariş ekleme gibi kritik mutation'larda da kullanın. | Faz 4 |
| 2 | **Zod şemalarını `packages/shared`'da tek kaynak tut** | Zaten yapılmış durumda. Frontend de aynı şemadan `z.infer` ile tip türetecek — client-server tipleri otomatik senkron kalır. | ✅ Mevcut |
| 3 | **Raporlama için ayrı query katmanı** | Saatlik dağılım, garson bazlı satış, ürün kârlılığı gibi raporları domain/use-case katmanından geçirmek yerine SQL view bazlı `ReportQueryService` kullanın. Transactional core şişmez. | Faz 7 |
| 4 | **Printer interface'i domain'de tanımla** | `PrinterPort` interface'i use-case katmanında yaşasın. USB/network/Bluetooth ESC/POS kararı Tauri tarafındaki infrastructure adapter'ına kalsın. Hangi donanımı seçerseniz seçin domain etkilenmez. | Faz 4 |
| 5 | **Çakışma çözümleme stratejisini yazıya dök** | Şu an "belirlemek" düzeyinde. Ama bu karar outbox şemasını, conflict UI'ı ve idempotency key tasarımını domine ediyor. Strateji: her outbox kaydı tipi ve payload'u olan bir domain operation olsun, entity snapshot'ı değil. | ✅ Belgelendi |

### Güçlü Öneriler

| # | Tavsiye | Neden |
|---|---------|-------|
| 6 | **Walking skeleton'ı öne çek** | Frontend'i backend tamamen bitene kadar ertelemeyin. En ince uçtan uca dilim (login → masa seç → sipariş → mutfağa gönder) API sözleşmelerini gerçek UI ihtiyacına karşı erken sınar. |
| 7 | **SQLite spike'ını erken yap** | Repository interface'lerinin gerçekten DB-agnostic olduğunu Faz 6'ya kadar beklemeden, DiningTable üzerinde doğrulayın. 10 use-case daha inşa etmeden test edin. |
| 8 | **Patron/Admin rol ayrımını netleştir** | `OWNER` = işletmeci (kendi verileri), `ADMIN` = teknik yönetici (her yere erişir). Yetki middleware'i buna göre yazılmalı. |
| 9 | **Stok/reçete/tedarikçiyi ayrı girişim olarak ele al** | Bunlar tek başına bir envanter modülü büyüklüğünde. Scope beklenmedik şekilde şişer — v1 kapsamına almayın. |

### Sorgulanabilir Özellikler

| Özellik | Soru | Karar |
|---------|------|-------|
| Masa birleştirme/değiştirme | Çorbacı senaryosunda gerçekten gerekli mi? | ❌ v1'den çıkarıldı |
| İskonto altyapısı | İkram zaten var. İskonto ayrı domain kararı gerektiriyor. | ❌ v2'ye ertelendi |
| Stok/reçete/gramaj | Tek başına envanter modülü büyüklüğünde. | ❌ Ayrı girişim |
| Çoklu şube | v1'de tek lokasyon varsayımı. | ❌ Uzun vade |

---

## 📋 Teknik Borç Takibi

| Borç | Konum | Öncelik | Durum |
|------|-------|---------|-------|
| `OrderRepository.getOrder()` dönüş tipi `unknown` | `interfaces/order-repository.ts` | Orta | ⏳ |
| `OrderTransaction.createOrder()` dönüş tipi `unknown` | `interfaces/order-repository.ts` | Orta | ⏳ |
| Eski `order-service.ts` ve `table-service.ts` dosyaları | `orders/`, `tables/` | Düşük | ⏳ Kullanılmıyor ama silinmedi |
| Domain mapper'larında `unknown` → `DecimalValue` cast | `domain-mappers.ts` | Düşük | ⏳ |
| Tekrarlanan `isPrismaError` fonksiyonları | `payment-routes.ts` | Düşük | ⏳ Shared handler mevcut, migration devam ediyor |
