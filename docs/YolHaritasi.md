# Nobel Ödülü Değerlendirme Sistemi — 3 Yönlü Mimari ve Geliştirme Planı

Bu doküman, mevcut **Faz 1** (PostgreSQL + Spring Boot + Angular çekirdek CRUD) kod tabanının üzerine inşa edilecek 3 ana modülün teknik tasarımını, veritabanı şemasına göre RBAC tasarım eleştirisini ve faz bazlı uygulama yol haritasını tanımlar.

---

## 1. Mevcut Proje Yapısının Özeti ve Yeni Mimariye Geçiş

Mevcut kod tabanında temiz bir temel bulunuyor:
* **Veritabanı:** `V1__init_schema.sql` (9 çekirdek ER tablosu + en az 3 uzman deferred constraint trigger) ve `V2__seed_data.sql`.
* **Backend (`tr.edu.nobel`):** `RegistryController` (genel kaynak CRUD), `CommitteeController` (komite + üye yönetimi), `RegistryService`, `CommitteeService`, `EntityDtoMapper` ve `GlobalExceptionHandler`.
* **Frontend (`frontend/src/app`):** `core/services/*` altındaki 8 kaynak servisi ve `features/` altındaki 5 standalone yönetim bileşeni (`kayitlar`, `adaylar`, `uzmanlar-komiteler`, `aday-gosterme`, `degerlendirmeler`).

Şu an tüm ekranlar tek bir `AppComponent` içinde sekme mantığıyla açıkta çalışıyor. Yeni mimaride sistem **3 bağımsız ama aynı veri ve olay omurgasını paylaşan katmana** ayrılacaktır:

1. **Meta-Admin Paneli (`/admin`):** Şifre/JWT korumalı, ham veritabanı ilişkilerinin ve kısıtların doğrudan yönetilip test edilebildiği mevcut arayüz.
2. **Gerçek Dünya RBAC Portalları (`/portal/*`):** Kuruluş, Aday ve Uzman rollerinin sadece kendi yetki ve sahiplik (ownership) sınırlarında işlem yaptığı gerçek iş akışı arayüzleri.
3. **Canlı ER Diyagramı & Karakter Animasyon Sahnesi (`/live-stage` + gömülü çekmece):** Sistemdeki gerçek HTTP/DB işlemlerini anlık dinleyip ER diyagramında ilgili tabloları yakan ve portfolyo karakterleriyle aday gösterme / oylama sahnelerini canlandıran görselleştirme katmanı.

---

## 2. Kritik Tasarım Denetimi: RBAC Akışı Veritabanı Şemasına Uygun mu?

Gerçek dünya RBAC akışı tasarlanırken veritabanı şemasıyla doğrudan çakışan veya düzeltilmesi gereken **5 kritik mimari nokta** vardır. Kodlamaya geçmeden bunların netleştirilmesi gerekir.

### 2.1. "Kuruluş aday gösterirken Aday hesabı yaratır" Yaklaşımı → Çift Kayıt (Duplication) Tuzağı
* **Sorun:** `aday_gosterme` ilişkisi M:N:P (ternary) yapıdadır; yani MIT de CERN de aynı bilim insanını (aynı `aday_id`) farklı veya aynı ödüllere önerebilir. Her kuruluş sıfırdan yeni bir `aday` satırı ve yeni kullanıcı hesabı oluşturursa veritabanında aynı kişiye ait birden fazla kayıt oluşur. Bu durum hem `degerlendirme` tablosunda komitenin adayı bütünsel değerlendirmesini bozar hem de adayın kendi hesabında tüm adaylıklarını tek yerde görmesini imkansız kılar.
* **Doğru Çözüm:** Kuruluş aday gösterme ekranı **iki adımlı (Find-or-Create)** çalışmalıdır:
  1. Kuruluş önce mevcut `aday` tablosunda ad/soyad/çalışma alanı ile arama yapar. Kişi zaten sistemdeyse o `aday_id` seçilir ve **yeni hesap açılmaz**; sadece yeni bir `aday_gosterme` kaydı eklenir.
  2. Kişi sistemde yoksa kuruluş aday bilgilerini girer. Backend tek bir `@Transactional` işlem içinde sırasıyla: `aday` kaydını açar → o `aday_id` ile bağlı bir `kullanici` hesabı (`ROLE_ADAY`, otomatik kullanıcı adı + tek kullanımlık/geçici şifre) üretir → `aday_gosterme` satırını yazar.

### 2.2. "Uzmanlar hesabına girip değerlendirir" Yaklaşımı → ER Diyagramındaki İlişki Öznesi
* **Sorun:** ER diyagramında `değerlendirir` ilişkisi `UZMAN` ile `ADAY` arasında değil, **`DEĞERLENDİRME_KOMİTESİ` ile `ADAY` arasındadır**. Yani `degerlendirme` tablosunda `uzman_id` sütunu yoktur, `komite_id` vardır. Ayrıca bir uzman birden fazla komitenin üyesi olabilir (`komite_uyesi` M:N). Tek bir uzmanın doğrudan `degerlendirme` tablosuna satır yazması, komite kavramını (en az 3 uzmanla ortak karar) anlamsızlaştırır.
* **Doğru Çözüm (İki Seçenek — Seçenek B Önerilir):**
  * **Seçenek A (Sıfır ek tablo — Saf ER):** Uzman giriş yapar, `komite_uyesi` üzerinden bağlı olduğu komiteleri görür, bir komiteyi seçip komite adına nihai `degerlendirme` kaydını girer. (Basittir ama bireysel oylama mekaniği eksiktir.)
  * **Seçenek B (Çekirdek ER'yi bozmadan bireysel oylama — Önerilen):** `V1` içindeki 9 ana tabloya dokunulmaz. Yeni bir migration ile sadece uygulama iş akışı için `uzman_oyu` tablosu eklenir (`oy_id`, `komite_id`, `uzman_id`, `aday_id`, `olcut`, `oy_karari`, `oy_tarihi`).
    * Komitedeki her uzman kendi hesabından girip bireysel oyunu (`KABUL`, `RED`, `CEKIMSER`) ve ölçüt notunu verir.
    * Bir aday için ilgili komitenin **en az 3 üyesi** oy kullandığında (veya komite çoğunluğu oluştuğunda), backend otomatik olarak (veya "Kararı Kesinleştir" butonuyla) çoğunluk sonucunu ana `degerlendirme` tablosuna yazar.
    * Bu yaklaşım hem **3. maddedeki karakterlerin sırayla oy kullanıp karar vermesi animasyonuna birebir uyar** hem de "en az 3 uzman" iş kuralını gerçek anlamda yaşatır.

### 2.3. Adayın Kimi ve Neyi Görebileceği (Gerçek Nobel Kuralı vs. Demo Şeffaflığı)
* **Gerçek Dünya Notu:** Gerçek Nobel sürecinde adaylıklar ve öneren kuruluşlar 50 yıl gizli tutulur; adaylar aday gösterildiklerini dahi bilmez.
* **Proje İçin Doğru Çözüm:** RBAC'yi ve ilişkisel sorguları (`aday → aday_gosterme → kurulus & odul`) göstermek için Aday Portalı kesinlikle olmalıdır. Ancak sisteme basit bir gizlilik ayarı (ör. Admin panelinde tek bir `kurulus_gizliligi` bayrağı veya varsayılan şeffaf + gizli mod seçeneği) eklemek harika olur:
  * **Şeffaf Mod (Varsayılan Demo):** Aday hangi ödüle, hangi kuruluş tarafından, hangi tarih/saatte aday gösterildiğini ve komite değerlendirme sonucunu görür.
  * **Nobel Gizlilik Modu:** Aday sadece ödüle aday gösterildiğini ve değerlendirme aşamasını görür; kuruluş adı `"Gizli Kuruluş"` olarak maskelenir.

### 2.4. Tarih ve Saat Bilgisinin Kaynağı (Sunucu vs. Kullanıcı Girişi)
* **Meta-Admin (`/admin`):** Test ve geçmiş veri girişi yapılabilmesi için `tarih` ve `saat` alanları formdan elle girilebilir kalmalıdır.
* **RBAC Portalları (`/portal/*`):** Bir kuruluş aday gösterdiğinde veya komite değerlendirme yaptığında `tarih` ve `saat` kullanıcıdan alınmamalı, **backend tarafından sunucu saatiyle (`LocalDate.now()`, `LocalTime.now()`) otomatik mühürlenmelidir.** Aksi halde kullanıcı geçmişe dönük sahte adaylık kaydı oluşturabilir.

### 2.5. Kategori Uyumu İş Kuralı (İsteğe Bağlı ama Güçlü Kural)
* Mevcut `V1` şemasında Fizik Komitesi'nin Barış Ödülü'ne aday gösterilmiş bir kişiyi değerlendirmesini engelleyen bir kural yoktur.
* RBAC Uzman Portalı'nda bir komite sadece **kendi `kategori_id`'sine ait bir ödüle (`odul.kategori_id = komite.kategori_id`) `aday_gosterme` kaydı bulunan adayları** değerlendirebilmelidir. Bu kural backend servis katmanında zorunlu tutulup, admin panelinde ham DB testi için esnek bırakılabilir.

---

## 3. Veritabanı Genişletme Tasarımı (Çekirdek ER'yi Bozmadan)

Ders/ER şemasının saflığını korumak için `V1__init_schema.sql` içindeki mevcut 9 tabloya **hiçbir kullanıcı/şifre sütunu eklenmemelidir**. Kimlik doğrulama ve oylama tabloları yeni Flyway migration dosyalarıyla (`V3` ve `V4`) ayrı bir uygulama katmanı olarak eklenmelidir.

### 3.1. `V3__auth_rbac.sql` — Kullanıcılar ve Rol Sahipliği

Tablo: `kullanici`

| Sütun | Tip | Kısıtlar | Açıklama |
| :--- | :--- | :--- | :--- |
| `kullanici_id` | `BIGSERIAL` | `PRIMARY KEY` | Benzersiz hesap ID |
| `kullanici_adi` | `VARCHAR(100)` | `NOT NULL UNIQUE` | Giriş adı (e-posta veya handle) |
| `sifre_hash` | `VARCHAR(255)` | `NOT NULL` | BCrypt hashlenmiş şifre |
| `rol` | `VARCHAR(30)` | `NOT NULL CHECK (...)` | `ADMIN`, `KURULUS`, `ADAY`, `UZMAN` |
| `aktif` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Hesap aktiflik durumu |
| `kurulus_no` | `BIGINT` | `UNIQUE FK → kurulus(kurulus_no) ON DELETE CASCADE` | Sadece `KURULUS` rolünde dolu |
| `aday_id` | `BIGINT` | `UNIQUE FK → aday(aday_id) ON DELETE CASCADE` | Sadece `ADAY` rolünde dolu |
| `uzman_id` | `BIGINT` | `UNIQUE FK → uzman(uzman_id) ON DELETE CASCADE` | Sadece `UZMAN` rolünde dolu |
| `olusturma_zamani` | `TIMESTAMP` | `NOT NULL DEFAULT NOW()` | Kayıt zamanı |

**PostgreSQL Seviyesinde Sahiplik Bütünlüğü (`CHECK` Kısıtı):**
Her kullanıcının rolü ile bağlı olduğu domain tablosu birebir örtüşmelidir:
* `rol = 'ADMIN'` ise `kurulus_no IS NULL AND aday_id IS NULL AND uzman_id IS NULL`
* `rol = 'KURULUS'` ise `kurulus_no IS NOT NULL AND aday_id IS NULL AND uzman_id IS NULL`
* `rol = 'ADAY'` ise `aday_id IS NOT NULL AND kurulus_no IS NULL AND uzman_id IS NULL`
* `rol = 'UZMAN'` ise `uzman_id IS NOT NULL AND kurulus_no IS NULL AND aday_id IS NULL`

### 3.2. `V4__expert_voting.sql` — Bireysel Uzman Oylaması (Seçenek B İçin)

Tablo: `uzman_oyu`

| Sütun | Tip | Kısıtlar | Açıklama |
| :--- | :--- | :--- | :--- |
| `oy_id` | `BIGSERIAL` | `PRIMARY KEY` | Benzersiz oy ID |
| `komite_id` | `BIGINT` | `NOT NULL` | İlgili değerlendirme komitesi |
| `uzman_id` | `BIGINT` | `NOT NULL` | Oy kullanan uzman |
| `aday_id` | `BIGINT` | `NOT NULL FK → aday(aday_id) ON DELETE CASCADE` | Değerlendirilen aday |
| `olcut` | `VARCHAR(255)` | `NOT NULL` | Değerlendirme ölçütü |
| `karar` | `VARCHAR(30)` | `NOT NULL CHECK (karar IN ('KABUL', 'RED', 'INCELEMEDE'))` | Uzmanın bireysel oyu |
| `oy_zamani` | `TIMESTAMP` | `NOT NULL DEFAULT NOW()` | Oy zamanı |

**Kritik Bileşik Yabancı Anahtar (Composite FK):**
`FOREIGN KEY (komite_id, uzman_id) REFERENCES komite_uyesi(komite_id, uzman_id) ON DELETE CASCADE`
Bu tek kısıt sayesinde **veritabanı seviyesinde**, bir komitenin üyesi olmayan hiçbir uzmanın o komite adına oy kullanamayacağı garanti edilir. Ayrıca `UNIQUE (komite_id, uzman_id, aday_id)` kısıtı ile bir uzmanın aynı komitede aynı adaya mükerrer oy atması engellenir.

### 3.3. `V5__seed_users.sql` — Hazır Test Hesapları
Sunumda ve geliştirmede hızlı giriş için mevcut `V2` seed verilerine bağlı demo hesaplar eklenir (örneğin `admin / admin123`, `kurulus_cern / 123456`, `uzman_1 / 123456`, `uzman_2 / 123456`, `uzman_3 / 123456`, `aday_1 / 123456`).

---

## 4. Pillar 1 & Pillar 2: Backend (Spring Boot) & Frontend (Angular) Mimarisi

### 4.1. Yetkilendirme Matrisi (RBAC + Ownership)

| Rol | Yapabileceği İşlemler | Görebileceği Veriler | Yasaklı Alanlar |
| :--- | :--- | :--- | :--- |
| **`ADMIN`** | Tüm 9 tabloda ham CRUD, komite kurma/üye çıkarma, gizlilik modu değiştirme, demo sıfırlama | Tüm sistem kayıtları + canlı olay akışı | Yok |
| **`KURULUS`** | Mevcut adayı veya yeni oluşturduğu adayı (hesabıyla birlikte) bir ödüle aday gösterme | Kategoriler, ödüller, mevcut aday arama listesi, **sadece kendi yaptığı** aday göstermeler | Diğer kuruluşların adaylıkları, komite içi oylar, admin CRUD |
| **`ADAY`** | Salt okunur portal (isteğe bağlı profil notu güncelleme) | **Sadece kendisine ait** aday göstermeler ve nihai değerlendirme sonuçları | Diğer adaylar, uzmanların bireysel oyları, aday ekleme/silme |
| **`UZMAN`** | Üyesi olduğu komiteler için adaylara bireysel oy verme; 3+ oy tamamlanınca komite kararını kesinleştirme | **Sadece üyesi olduğu komiteler**, o komitenin kategorisindeki adaylar, komite arkadaşlarının oyları | Üye olmadığı komiteler, kuruluş/ödül CRUD, admin paneli |

### 4.2. Backend Paket Genişletmesi (`tr.edu.nobel` — SOLID Uyumlu)

Mevcut katmanlar bozulmadan şu yeni paketler eklenir:

* `security/`
  * `SecurityConfig`: Stateless JWT filtre zinciri, CORS, BCrypt `PasswordEncoder`.
  * `JwtTokenProvider` & `JwtAuthenticationFilter`: Token üretimi ve doğrulama (`sub`, `role`, `entityId` claim'leri).
  * `CurrentUserPrincipal`: Oturum açan kullanıcının `kullaniciId`, `rol` ve bağlı `kurulusNo / adayId / uzmanId` bilgisini taşır.
* `controller/`
  * `AuthController` (`/api/auth/login`, `/api/auth/me`)
  * Mevcut `RegistryController` ve `CommitteeController` → `@PreAuthorize("hasRole('ADMIN')")` ile korunur ve isteğe bağlı olarak `/api/admin/...` prefix'ine alınır (veya mevcut URL'ler korunup rol kontrolü eklenir).
  * `KurulusPortalController` (`/api/portal/kurulus/aday-gostermeler`, `/api/portal/kurulus/aday-ara`)
  * `AdayPortalController` (`/api/portal/aday/ozet`)
  * `UzmanPortalController` (`/api/portal/uzman/komitelerim`, `/api/portal/uzman/oylar`, `/api/portal/uzman/karar-kesinlestir`)
  * `ActivityStreamController` (`/api/events/stream` — Server-Sent Events akışı, Pillar 3 için)
* `service/`
  * `AuthService` / `AuthServiceImpl`
  * `NominationWorkflowService` (Find-or-Create Aday + Hesap açma + Sunucu tarih/saatiyle `aday_gosterme` kaydı)
  * `EvaluationWorkflowService` (Üyelik doğrulama + Oy kaydetme + 3+ oy çoğunluk kontrolü + `degerlendirme` kaydı üretme)
  * `DomainEventPublisher` (Her kritik DB işlemi commit olduğunda `@TransactionalEventListener(phase = AFTER_COMMIT)` ile SSE kanalına canlı animasyon olayı basar!)

> **SOLID Notu:** `DomainEventPublisher` sayesinde `RegistryService` veya `NominationWorkflowService` animasyon sistemini hiç bilmez; sadece bir Spring `ApplicationEvent` fırlatır. Animasyon / SSE modülü bu olayları pasif olarak dinler (Open/Closed ve Dependency Inversion).

### 4.3. Angular Route ve Klasör Yapısı

Mevcut düz sekme yapısı Angular Router (`provideRouter`) ile bölünür:

* `/login` → Rol bazlı giriş ekranı (sunumda kolaylık için tek tıkla "Demo Hesap Doldur" kısayol butonları opsiyonel olarak eklenebilir)
* `/admin` (`canActivate: [authGuard, roleGuard('ADMIN')]`) → Mevcut 5 bileşenin taşındığı `AdminShellComponent`:
  * `/admin/kayitlar`
  * `/admin/adaylar`
  * `/admin/uzmanlar-komiteler`
  * `/admin/aday-gosterme`
  * `/admin/degerlendirmeler`
* `/portal/kurulus` (`roleGuard('KURULUS')`) → Aday arama / yeni aday + ödül seçimi + yapılan adaylıklar tablosu (yeni aday oluşturulduysa oluşan geçici giriş bilgilerini tek seferlik kopyalanabilir kartta gösterir)
* `/portal/aday` (`roleGuard('ADAY')`) → "Aday Gösterildiğim Ödüller" ve "Komite Değerlendirme Sonuçlarım" kartları
* `/portal/uzman` (`roleGuard('UZMAN')`) → Üyesi olunan komiteler, bekleyen adaylar, ölçüt seçerek oy verme paneli ve 3/3 oy doluluk göstergesi
* `/live-stage` (Herkese açık veya giriş yapmış kullanıcılara açık) → Tam ekran Canlı ER Diyagramı + Karakter Animasyon Sahnesi

Ayrıca `core/interceptors/auth.interceptor.ts` tüm isteklere `Authorization: Bearer <token>` başlığını otomatik ekler ve 401/403 durumlarında kullanıcıyı uygun sayfaya yönlendirir.

---

## 5. Pillar 3: Canlı ER Diyagramı ve Portfolyo Karakter Animasyon Mimarisi

Bu katman projenin görsel imzasıdır. İki senkronize bileşenden oluşur ve **gerçek backend işlemlerini SSE (Server-Sent Events) üzerinden canlı dinler**.

### 5.1. Olay Sözleşmesi (Event Contract — Backend → Frontend)

Backend, her başarılı veritabanı işleminde (veya kısıt hatasında) `/api/events/stream` üzerinden aşağıdaki JSON yapısında bir olay yayınlar:

    {
      "eventId": "evt-9042",
      "timestamp": "2026-11-21T14:32:10",
      "action": "EXPERT_VOTED",
      "actorRole": "UZMAN",
      "actorLabel": "Prof. Dr. İlker Kaya",
      "sqlSummary": "INSERT INTO uzman_oyu (komite_id=1, uzman_id=2, aday_id=4, karar='KABUL')",
      "erHighlight": {
        "nodes": ["UZMAN", "uyesidir", "DEGERLENDIRME_KOMITESI", "degerlendirir", "ADAY"],
        "edges": ["UZMAN-uyesidir", "uyesidir-DEGERLENDIRME_KOMITESI", "DEGERLENDIRME_KOMITESI-degerlendirir", "degerlendirir-ADAY"],
        "severity": "success"
      },
      "stageCue": {
        "scene": "COMMITTEE_VOTE",
        "committeeId": 1,
        "expertId": 2,
        "candidateName": "Dr. Selin Arslan",
        "vote": "KABUL",
        "votesCast": 3,
        "votesRequired": 3
      }
    }

`severity` değeri `"error"` olduğunda (örneğin 3'ten az uzmanla komite oluşturma veya 3 üyeli komiteden üye silme denendiğinde PostgreSQL trigger'ı hata fırlattığında) `GlobalExceptionHandler` bunu da bir `CONSTRAINT_VIOLATION` olayı olarak yayınlar. Böylece ER diyagramındaki `üyesidir` ve `DEĞERLENDİRME_KOMİTESİ` düğümleri **kırmızı yanıp söner**!

### 5.2. Bileşen A: İnteraktif SVG ER Diyagramı (`ErLiveMapComponent`)

* ER diyagramın (6 varlık dikdörtgeni, 5 ilişki elması ve bağlantı çizgileri) sabit ve temiz bir **Angular inline SVG** bileşeni olarak kodlanır.
* Her varlık ve elmas kendi kimliğine sahiptir (`KURULUS`, `ADAY`, `ODUL`, `KATEGORI`, `DEGERLENDIRME_KOMITESI`, `UZMAN`, `aday_gosterir`, `kategorisine_aittir`, `olusturulur`, `degerlendirir`, `uyesidir`).
* **Görsel Efektler (Saf CSS — ağır kütüphane gerektirmez):**
  * **Pasif durum:** Soluk koyu yeşil/slate çizgiler (mevcut Nobel temasıyla uyumlu).
  * **Aktif ışıklandırma:** `erHighlight.nodes` içindeki öğelere `.node-active` (altın parıltı `drop-shadow` + hafif ölçekleme) veya hata durumunda `.node-error` (kırmızı titreşim) sınıfı eklenir.
  * **Veri akışı:** Aktif bağlantı çizgilerinde CSS `stroke-dasharray` + `stroke-dashoffset` animasyonu ile verinin hangi tablodan hangi tabloya aktığı görselleştirilir.
  * **SQL Alt Bandı:** Diyagramın altında son 3 işlemin canlı SQL özeti terminal şeridi gibi akar.

### 5.3. Bileşen B: Portfolyo Karakter Sahnesi (`CharacterStageComponent` & Adapter Deseni)

Halihazırda portfolyonda kullandığın karakterlerin çizim/animasyon kodunu Angular bileşeninin iş mantığına doğrudan karıştırmamak için bir **Adapter (Bağdaştırıcı) arayüzü** tanımlanır:

    export interface StageCharacterCommand {
      scene: 'IDLE' | 'NOMINATION' | 'COMMITTEE_VOTE' | 'DECISION_FINALIZED' | 'CONSTRAINT_ERROR';
      actorLabel: string;
      targetLabel?: string;
      vote?: 'KABUL' | 'RED' | 'INCELEMEDE';
      votesCast?: number;
      votesRequired?: number;
    }

    export interface PortfolioStageAdapter {
      mount(container: HTMLElement): void;
      play(command: StageCharacterCommand): void;
      destroy(): void;
    }

**Portfolyo Kodunu Entegre Etme Adımları:**
1. Portfolyondaki karakter görsellerini/sprite'larını (veya Canvas/CSS çizim modüllerini) `frontend/src/assets/characters/` ve `frontend/src/app/features/live-stage/engine/` altına taşı.
2. Mevcut karakter kodunu `PortfolioStageAdapter` arayüzünü implemente eden tek bir sınıfa sar (`NobelCharacterAdapter`).
3. Angular bileşeni (`CharacterStageComponent`), `ActivityStreamService`'ten gelen her `stageCue` olayını doğrudan `adapter.play(cue)` çağrısına çevirsin.

**Olaylara Göre Karakter Sahne Koreografisi:**
* **Aday Gösterme (`NOMINATION`):** Kuruluş karakteri elinde altın zarfla yürür → Aday karakteri sahneye zıplayarak gelir (yeni hesap açıldıysa üstünde `"Yeni Hesap!"` balonu çıkar) → Ödül kürsüsüne zarf bırakılır.
* **Uzman Oylaması (`COMMITTEE_VOTE`):** Komite masasında en az 3 uzman karakteri sıralanır → Oy kullanan uzman karakteri öne çıkıp yeşil (`KABUL`), kırmızı (`RED`) veya sarı (`INCELEMEDE`) oy kartını kaldırır; masanın üstündeki sayaç `1/3 → 2/3 → 3/3` şeklinde dolar.
* **Komite Kararı Kesinleşti (`DECISION_FINALIZED`):** 3+ oy tamamlanınca tüm uzman karakterleri aynı anda tokmağı vurur / alkışlar; Aday karakteri `KABUL` aldıysa konfeti + madalya, `RED` aldıysa üzgün ifade animasyonu oynar.
* **PostgreSQL Kısıt İhlali (`CONSTRAINT_ERROR`):** 3 üyeli komiteden üye çıkarılmaya çalışıldığında uzman karakteri masadan kalkmaya çalışır, bir kalkan/bariyer ("PostgreSQL Trigger: En az 3 uzman gerekli!") onu geri oturtur.

### 5.4. İki Farklı Kullanım Modu (Sunum İçin İdeal)
* **Canlı Çekmece (Mini Dock):** Admin ve Portal ekranlarının sağ veya alt kısmında açılıp kapanabilen kompakt mod. Tek ekranda form doldururken eşzamanlı ışıkları ve karakterleri gösterir.
* **Çift Ekran / Canlı Gözlem (`/live-stage`):** SSE bağlantısı sayesinde bir tarayıcı sekmesinde (veya başka bir cihazda) Kuruluş/Uzman olarak işlem yaparken, projektöre yansıtılan `/live-stage` sekmesinde ER ışıkları ve karakter animasyonları **sayfa yenilemeden gerçek zamanlı** çalışır.

---

## 6. Önerilen Uygulama Yol Haritası (Fazlara Bölünmüş — Codex Dostu)

Tek promptta tüm sistemi yıkmak yerine **3 ayrı, temiz fazda** ilerlemek hem hata riskini sıfırlar hem de her faz sonunda çalışan bir ürün verir:

| Faz | Kapsam | Çıktı / Doğrulama Kriteri |
| :--- | :--- | :--- |
| **Faz 2A: Auth + `/admin` İzolasyonu** | `V3__auth_rbac.sql`, `V5__seed_users.sql`, Spring Security + JWT, Angular Router + `authGuard` + `/login` + mevcut 5 ekranın `/admin` altına taşınması | `/admin` şifresiz açılmaz; `admin` girişiyle mevcut tüm CRUD ve 3-uzman trigger testleri sorunsuz çalışır. |
| **Faz 2B: Gerçek Dünya RBAC Portalları** | `V4__expert_voting.sql`, `KurulusPortal`, `AdayPortal`, `UzmanPortal` controller/service/Angular sayfaları, Find-or-Create aday akışı, sunucu tarih/saati, 3+ oy ile otomatik `degerlendirme` yazımı | Kuruluş yeni aday oluşturup önerir → o adayla giriş yapılıp adaylık görülür → 3 uzman ayrı ayrı oy verince `degerlendirme` kaydı otomatik oluşur. |
| **Faz 3: Canlı ER + Portfolyo Karakter Sahnesi** | Backend `DomainEventPublisher` + SSE (`/api/events/stream`), Angular `ActivityStreamService`, `ErLiveMapComponent` (SVG), `PortfolioStageAdapter` ile portfolyo karakterlerinin bağlanması, `/live-stage` + mini dock | Herhangi bir portal veya `/admin` aksiyonunda `/live-stage` ekranında ilgili ER düğümleri yanar ve karakterler animasyonu oynatır. |