# NOBEL ÖDÜLÜ DEĞERLENDİRME SİSTEMİ — CODEX UYGULAMA PROMPTLARI

Sıra: **2A → 2B → 3A → 3B**. Her faz kendi doğrulama adımlarıyla biter; bir sonraki faza geçmeden önce o fazın testlerinin yeşil olduğundan emin ol. Her kod bloğunun içeriği olduğu gibi Codex'e yapıştırılır.

---

## FAZ 2A — Kimlik Doğrulama (JWT + Spring Security) ve `/admin` İzolasyonu

````markdown
# FAZ 2A — Kimlik Doğrulama (JWT + Spring Security) ve `/admin` İzolasyonu

Sen kıdemli bir full-stack mühendissin (Spring Boot 3.5 / Java 21 / PostgreSQL 16 / Flyway / Angular 21). Bu görevi tek seferde, derlenen ve testleri geçen bir halde teslim et. **Varsayım yapma:** aşağıdaki tablo/sütun/sınıf adları örnektir; gerçek adları önce repodan oku.

## 0. Proje değişmezleri (tüm fazlar için geçerli)

- Veritabanı: PostgreSQL 16 + Flyway. `V1__init_schema.sql` (9 çekirdek ER tablosu + "komitede en az 3 uzman" deferred constraint trigger'ları) ve `V2__seed_data.sql` **asla düzenlenmez**. Yeni tablolar yalnızca yeni migration dosyalarıyla eklenir (`V3`, `V4`, `V5`).
- `spring.jpa.hibernate.ddl-auto=validate` kalır. Her yeni tablo için entity birebir uyumlu olmalı (tip, nullability, sütun adı), yoksa uygulama açılmaz.
- Backend paketi `tr.edu.nobel`; katmanlar: `config`, `controller`, `dto/request`, `dto/response`, `entity`, `exception`, `mapper`, `repository`, `service`. SOLID: controller yalnızca HTTP/DTO, iş kuralı service'te, service'ler arayüz + `Impl` (projedeki mevcut kalıbı izle), bağımlılıklar constructor injection.
- DTO izolasyonu: entity hiçbir zaman HTTP yanıtına veya isteğine çıkmaz. Hata gövdeleri için projedeki mevcut `GlobalExceptionHandler` + hata DTO'su kullanılır; yeni bir hata formatı icat etme.
- Frontend: Angular 21, standalone bileşenler, Reactive Forms, `provideHttpClient()`, klasörler `core/models`, `core/services`, `features/`, `shared/`. Yeni kod `inject()` ve signal kullanır; NgModule yok. UI metinleri Türkçe.
- Projedeki mevcut test altyapısını kullan (backend: JUnit 5 + Spring Boot Test; frontend: projede kurulu test runner — Vitest veya Karma). Backend entegrasyon testleri gerçek PostgreSQL ister: projede yoksa Testcontainers (`postgres:16`) + `@ServiceConnection` ekle.

## 1. Önceki Fazdan Devralınan Durum (Faz 1 — çalışır halde)

- Veritabanı: `V1` + `V2` uygulanmış; `kurulus`, `aday`, `odul`, `kategori`, `uzman`, `degerlendirme_komitesi` (adı repodan doğrula), `komite_uyesi`, `aday_gosterme`, `degerlendirme` tabloları ve seed verisi mevcut.
- Backend: `RegistryController` (genel kaynak CRUD), `CommitteeController` (komite + üye yönetimi), `RegistryService`, `CommitteeService`, `EntityDtoMapper`, `GlobalExceptionHandler`. **Şu an hiçbir endpoint korumalı değil.**
- Frontend: tek `AppComponent` içinde sekmelerle açılan 5 standalone yönetim ekranı (`kayitlar`, `adaylar`, `uzmanlar-komiteler`, `aday-gosterme`, `degerlendirmeler`) ve `core/services/*` altında 8 kaynak servisi. Router henüz yok.

## 2. Bu Fazın Kapsam Sınırı (YAPILMAYACAKLAR)

Bu fazda kesinlikle yapılmayacak (sonraki fazların işi):
- `uzman_oyu` tablosu / `V4`, Kuruluş-Aday-Uzman portal controller/service/sayfaları, Find-or-Create aday akışı, gizlilik modu **endpoint'leri**, oylama ve karar kesinleştirme.
- SSE, `DomainEventPublisher`, ER diyagramı, `/live-stage`, mini dock, karakter/animasyon.
- Kullanıcı CRUD ekranı, şifre değiştirme, refresh token, OAuth, "beni hatırla", rate-limit.
- `RegistryController` / `CommitteeController` URL'leri, iş mantığı ve DTO'ları değişmez; yalnızca sınıf düzeyinde yetki eklenir. Mevcut 5 bileşenin iç mantığı ve şablonları değişmez; yalnızca kabuk/rota katmanına taşınırlar.
- `/portal/*` rotaları bu fazda **yer tutucu** sayfalara gider (gerçek içerik Faz 2B).

## 3. Keşif (kod yazmadan önce oku, kısa bir "Keşif Notu" yaz)

`V1__init_schema.sql`, `V2__seed_data.sql`, `application.yml`, build dosyası (`pom.xml`/`build.gradle`), mevcut `config/*` (özellikle CORS), `GlobalExceptionHandler` (**catch-all `Exception` handler var mı?** — varsa `AccessDeniedException` onun tarafından 500'e çevrilir; aşağıda düzeltilecek), `RegistryController`, `CommitteeController`, `AppComponent`, `app.config.ts`, `environment*.ts`, `proxy.conf.json` (varsa), 8 servisin API taban URL'si. PK adlarını ve tiplerini (`kurulus_no`, `aday_id`, `uzman_id` — BIGINT/INTEGER) not al.

## 4. Veritabanı

### 4.1 `V3__auth_rbac.sql`

```sql
CREATE TABLE kullanici (
    kullanici_id     BIGSERIAL PRIMARY KEY,
    kullanici_adi    VARCHAR(100) NOT NULL UNIQUE,
    sifre_hash       VARCHAR(255) NOT NULL,
    rol              VARCHAR(30)  NOT NULL,
    aktif            BOOLEAN      NOT NULL DEFAULT TRUE,
    kurulus_no       BIGINT UNIQUE REFERENCES kurulus(kurulus_no) ON DELETE CASCADE,
    aday_id          BIGINT UNIQUE REFERENCES aday(aday_id)       ON DELETE CASCADE,
    uzman_id         BIGINT UNIQUE REFERENCES uzman(uzman_id)     ON DELETE CASCADE,
    olusturma_zamani TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_kullanici_rol CHECK (rol IN ('ADMIN','KURULUS','ADAY','UZMAN')),
    CONSTRAINT ck_kullanici_sahiplik CHECK (
        (rol = 'ADMIN'   AND kurulus_no IS NULL     AND aday_id IS NULL     AND uzman_id IS NULL) OR
        (rol = 'KURULUS' AND kurulus_no IS NOT NULL AND aday_id IS NULL     AND uzman_id IS NULL) OR
        (rol = 'ADAY'    AND aday_id IS NOT NULL    AND kurulus_no IS NULL  AND uzman_id IS NULL) OR
        (rol = 'UZMAN'   AND uzman_id IS NOT NULL   AND kurulus_no IS NULL  AND aday_id IS NULL))
);

-- Faz 2B'de kullanılacak uygulama ayarı (bu fazda entity/endpoint YOK).
CREATE TABLE sistem_ayari (
    anahtar           VARCHAR(100) PRIMARY KEY,
    deger             VARCHAR(255) NOT NULL,
    guncelleme_zamani TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_sistem_ayari_gizlilik CHECK (anahtar <> 'GIZLILIK_MODU' OR deger IN ('SEFFAF','GIZLI'))
);
INSERT INTO sistem_ayari (anahtar, deger) VALUES ('GIZLILIK_MODU', 'SEFFAF');
```

FK sütun tiplerini V1'deki gerçek PK tiplerine göre doğrula. `V1`'e hiçbir sütun/şifre eklenmez; kimlik katmanı ER çekirdeğinden ayrıdır.

### 4.2 `V5__seed_users.sql` (demo hesapları, BCrypt cost 10 — hash'ler hazır ve doğrulanmıştır)

- `admin / admin123` → `$2a$10$x.WxsACdJYiniYJ0jkPBsO7YrpYUGQl7z12.Ho/s1dNQEwmF0xBJ.`
- Diğer tüm demo hesaplar `/ 123456` → `$2a$10$ahWb7U/ffZYRXhKi3oYJS.lv0i2fecNL9ZUUfltHAcjEpRPfOtCa`

Hesaplar: `admin` (ADMIN), `kurulus_cern` (KURULUS), `uzman_1`, `uzman_2`, `uzman_3` (UZMAN), `aday_1` (ADAY). **Sabit ID yazma**; V2 seed satırlarına doğal anahtarla bağlan:
- `kurulus_cern`: adı CERN olan kuruluş (V2'de CERN yoksa V2'deki ilk kuruluşu seç ve kullanıcı adını yine `kurulus_cern` bırak; kararını Keşif Notu'na yaz).
- `uzman_1..3`: V2'deki **ilk komitenin** ilk üç üyesi (`ROW_NUMBER() OVER (ORDER BY uzman_id)` ile `INSERT ... SELECT`). Böylece Faz 2B'de üçü aynı komitede oy kullanabilir.
- `aday_1`: `MIN(aday_id)` olan aday.
Hash'leri Java'da doğrulayan bir test yaz (aşağıda).

### 4.3 Flyway numaralandırma tuzağı (önemli)

`V5` bu fazda uygulanacak, `V4` ise Faz 2B'de eklenecek. Flyway varsayılanda "uygulanmış en yüksek sürümden düşük bekleyen migration"ı reddeder. Bu yüzden `application.yml`'e **`spring.flyway.out-of-order: true`** ekle ve yanına neden gerektiğini anlatan bir yorum yaz. `V4` dosyasını bu fazda **oluşturma**, boş yer tutucu da koyma.

## 5. Backend

### 5.1 Bağımlılıklar ve yapılandırma
- `spring-boot-starter-security`; JWT için `io.jsonwebtoken:jjwt-api/jjwt-impl/jjwt-jackson` (0.12.6 veya Maven Central'daki güncel 0.12.x/0.13.x; builder/parser API'sini seçilen sürüme göre kullan); test için `spring-security-test`.
- `application.yml`:
  ```yaml
  nobel:
    time-zone: Europe/Istanbul
    security:
      jwt:
        secret: ${NOBEL_JWT_SECRET:dev-only-secret-change-me-dev-only-secret-change-me}
        expiration: PT8H
  ```
  `JwtProperties` (`@ConfigurationProperties`, record, `@Validated`): secret en az 32 bayt değilse uygulama **açılışta** hata versin.
- `config/ClockConfig`: `Clock` bean'i (`Clock.system(ZoneId.of(nobel.time-zone))`); tarih/saat okuyan her sınıf bu bean'i kullanır (Faz 2B'de sunucu mühürü için).
- `config/SecurityConfig`: `@EnableMethodSecurity`, stateless (`SessionCreationPolicy.STATELESS`), CSRF kapalı (header tabanlı JWT), mevcut CORS yapılandırmasını kullan (`Authorization` başlığına izin ver; yeni bir CORS kaynağı yazma, mevcut olanı genişlet), `BCryptPasswordEncoder` bean'i (cost 10), `JwtAuthenticationFilter` `UsernamePasswordAuthenticationFilter` öncesinde.
  İstek kuralları (bu sırayla):
  - `OPTIONS /**` → permitAll; `POST /api/auth/login` → permitAll; `/error` → permitAll
  - `/api/admin/**` → `hasRole('ADMIN')`
  - `/api/portal/kurulus/**` → `hasRole('KURULUS')`; `/api/portal/aday/**` → `hasRole('ADAY')`; `/api/portal/uzman/**` → `hasRole('UZMAN')` (controller'lar Faz 2B'de gelecek; kuralı şimdi koy ki sonraki faz bu dosyaya dokunmasın)
  - diğer her şey → `authenticated()`
  - Kimliksiz istek **401**, yetkisiz **403**, ikisi de mevcut hata DTO'suyla JSON: `JsonAuthenticationEntryPoint`, `JsonAccessDeniedHandler`.

### 5.2 Sınıflar
- `entity/Rol` (enum: `ADMIN, KURULUS, ADAY, UZMAN`), `entity/Kullanici` (V3 ile birebir; `@Enumerated(EnumType.STRING)`; ilişki yerine düz `Long kurulusNo/adayId/uzmanId` alanları), `repository/KullaniciRepository` (`findByKullaniciAdi`).
- `security/CurrentUserPrincipal` (record: `kullaniciId, kullaniciAdi, rol, kurulusNo, adayId, uzmanId`; yardımcı `entityId()`), `security/JwtTokenProvider` (üret/doğrula; claim'ler: `sub`=kullanıcı adı, `uid`, `role`, `entityId`, `iat`, `exp`; zamanı `Clock`'tan al), `security/JwtAuthenticationFilter` (`Authorization: Bearer`; imza/süre geçerliyse kullanıcıyı **veritabanından yeniden yükle**, `aktif=true` ve token'daki rolün hâlâ aynı olduğunu doğrula; yetki olarak `ROLE_<ROL>`; hata durumunda kimlik koyma, hatayı entry point'e bırak).
- `service/AuthService` + `AuthServiceImpl`: `login(LoginRequest)` ve `me(CurrentUserPrincipal)`. Yanlış kullanıcı/şifre/pasif hesap için **aynı** genel mesaj ("Kullanıcı adı veya şifre hatalı") ve 401; kullanıcı bulunamasa bile sahte hash karşılaştırması yap (zamanlama farkı sızdırma).
- `service/AccountLabelService` (Strategy): `AccountLabelProvider` arayüzü + `AdminLabelProvider`, `KurulusLabelProvider`, `AdayLabelProvider`, `UzmanLabelProvider` (her biri kendi tablosundan görünen adı üretir, örn. uzman için "unvan ad soyad"). Yeni rol = yeni provider (Open/Closed). `/me` ve login yanıtındaki `displayName` buradan gelir; Faz 3A aynı servisi olay etiketleri için kullanacak.
- `dto/request/LoginRequest` (`kullaniciAdi`, `sifre`; `@NotBlank`), `dto/response/LoginResponse` (`accessToken`, `tokenType="Bearer"`, `expiresAt`, `user`), `dto/response/AuthUserResponse` (`kullaniciId, kullaniciAdi, rol, kurulusNo, adayId, uzmanId, displayName`; **`sifreHash` hiçbir DTO'da yok**). Mapper `mapper/` altında.
- `controller/AuthController`: `POST /api/auth/login`, `GET /api/auth/me`.
- `RegistryController` ve `CommitteeController`: sınıf düzeyinde `@PreAuthorize("hasRole('ADMIN')")`. URL'ler **aynen kalır**.
- `GlobalExceptionHandler`: `AccessDeniedException` → 403, `AuthenticationException` → 401 için **açık** handler ekle (catch-all handler 500'e çevirmesin). Mevcut handler'ların davranışı değişmez.

## 6. Frontend

### 6.1 Dosyalar
- `core/models/auth.models.ts` (`Rol`, `AuthUser`, `LoginRequest`, `LoginResponse`), `core/services/auth.service.ts`, `core/guards/auth.guard.ts` (`authGuard: CanActivateFn`), `core/guards/role.guard.ts` (`roleGuard(...roller): CanActivateFn`), `core/interceptors/auth.interceptor.ts` (`HttpInterceptorFn`).
- `features/auth/login/login.component.*`, `features/admin/admin-shell/admin-shell.component.*`, `shared/forbidden/forbidden.component.*`, `features/portal/portal-placeholder/portal-placeholder.component.*`.
- `app.routes.ts`, `app.config.ts` (`provideRouter(routes)`, `provideHttpClient(withInterceptors([authInterceptor]))`, `provideAppInitializer(() => inject(AuthService).restore())`), `AppComponent` → yalnızca `<router-outlet />`.

### 6.2 Davranış
- **`AuthService`**: `user` (signal), `isAuthenticated` (computed), `login()`, `logout()`, `restore()`, `hasRole()`, `homeFor(rol)` (ADMIN→`/admin`, KURULUS→`/portal/kurulus`, ADAY→`/portal/aday`, UZMAN→`/portal/uzman`). Token **`sessionStorage`**'da tutulur (localStorage değil): sunumda aynı tarayıcıda farklı sekmelerde farklı roller açılacak ve sekmeler birbirinin oturumunu ezmemeli. Tüm storage erişimleri try/catch. `restore()`: token varsa `GET /api/auth/me` çağırır, 401'de oturumu temizler, backend'e ulaşılamazsa uygulamayı kilitlemeden oturumsuz devam eder.
- **`authInterceptor`**: `Authorization: Bearer <token>` başlığını **yalnızca API taban URL'sine** giden isteklere ekler (3. taraf URL'lere token sızdırma). 401 → oturumu temizle, `/login?reason=expired&returnUrl=…`'e yönlendir (`/api/auth/login` isteğinin kendi 401'i hariç). 403 → `/forbidden`.
- **`authGuard`**: oturum yoksa `/login?returnUrl=<hedef>`; **`roleGuard`**: oturum var ama rol uymuyorsa `/forbidden`.
- **Rotalar**:
  - `''` → `login`; `login`; `forbidden`
  - `admin` (`canActivate: [authGuard, roleGuard('ADMIN')]`, `loadComponent: AdminShellComponent`) → çocuklar: `kayitlar` (varsayılan), `adaylar`, `uzmanlar-komiteler`, `aday-gosterme`, `degerlendirmeler`; hepsi mevcut bileşenleri `loadComponent` ile açar.
  - `portal/kurulus` (`roleGuard('KURULUS')`), `portal/aday` (`roleGuard('ADAY')`), `portal/uzman` (`roleGuard('UZMAN')`) → hepsi `PortalPlaceholderComponent` ("Bu portal Faz 2B'de etkinleşecek" + oturum bilgisi + çıkış). Faz 2B yalnızca bu üç rotanın `loadComponent`'ini değiştirecek.
  - `**` → `login`
- **`LoginComponent`**: Reactive Form (`kullaniciAdi`, `sifre`), yükleniyor/hata durumları, `returnUrl` varsa oraya, yoksa `homeFor(rol)`'e yönlendirme, `reason=expired` ise bilgi mesajı. **Yalnızca `isDevMode()` iken** "Demo Hesap Doldur" kısayol düğmeleri (admin, kurulus_cern, uzman_1, aday_1) formu doldurur; otomatik giriş yapmaz.
- **`AdminShellComponent`**: eski `AppComponent`'teki sekme çubuğu/başlık işaretlemesi ve stilleri buraya taşınır (görünüm aynı kalsın); sekmeler `routerLink` + `routerLinkActive`; başlıkta kullanıcı `displayName` + "Çıkış". Mevcut 5 bileşenin dosyalarını değiştirme.
- Dev proxy/ortam yapılandırması mevcut haliyle çalışmaya devam etmeli; yeni yapılandırma gerekiyorsa minimum düzeyde ekle.

## 7. Testler (hepsi yeşil olmalı)

Backend:
1. `JwtTokenProviderTest`: üretilen token doğrulanır; süresi geçmiş (sahte `Clock`) ve imzası bozuk token reddedilir; 32 bayttan kısa secret açılışta hata verir.
2. `SeedUserHashTest`: V5'teki iki hash `PasswordEncoder.matches("admin123", …)` ve `matches("123456", …)` ile doğrulanır.
3. `AuthControllerIT` (gerçek PostgreSQL + Flyway): `admin/admin123` → 200 + token; yanlış şifre → 401 aynı mesaj; pasif hesap (testte `aktif=false` yap) → 401; `/api/auth/me` token ile 200, tokensız 401.
4. `SecurityRulesIT`: tokensız `GET` mevcut kayıt endpoint'i → 401; ADMIN token → 200; KURULUS token (testte oluşturulmuş kullanıcı) → 403; `OPTIONS` ön-uçuş tokensız geçer; JWT'deki rol ile DB'deki rol farklıysa 401.
5. `KullaniciSchemaIT`: `kullanici` tablosuna CHECK'i ihlal eden satırlar (ör. `rol='UZMAN'` + `kurulus_no` dolu; `rol='ADMIN'` + `aday_id` dolu) `DataIntegrityViolationException` ile reddedilir; `ddl-auto=validate` ile uygulama bağlamı açılır; `flyway_schema_history`'de `V3` ve `V5` başarılı görünür.

Frontend:
6. `AuthService` (login → token `sessionStorage`'a yazılır, logout temizler, `restore` 401'de temizler), `authGuard`/`roleGuard` (yönlendirme URL'leri), `authInterceptor` (başlık yalnızca API URL'sinde; 401/403 davranışı) birim testleri.

## 8. Doğrulama (her adımın çıktısını teslim notuna yaz)

1. Backend testlerini çalıştır (`./mvnw verify` veya `./gradlew test`) → hepsi yeşil. Frontend: derleme (`ng build`) + testler → yeşil, uyarı/hata yok.
2. Temiz bir veritabanıyla uygulamayı başlat; `SELECT version, success FROM flyway_schema_history ORDER BY installed_rank;` → `1,2,3,5` ve hepsi `true`.
3. `curl -i localhost:8080/api/<mevcut-kayit-endpointi>` → **401**. `curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' -d '{"kullaniciAdi":"admin","sifre":"admin123"}'` → token; bu token ile aynı endpoint → **200**; `kurulus_cern` token'ıyla → **403**.
4. Tarayıcı: `/admin` oturumsuz → `/login?returnUrl=%2Fadmin`; `admin/admin123` ile giriş → `/admin/kayitlar`; 5 sekmenin hepsinde Faz 1'deki CRUD ve "3'ten az uzmanlı komite oluşturma / 3 üyeli komiteden üye silme" trigger hatası **eskisi gibi** çalışır; `kurulus_cern` ile giriş → `/portal/kurulus` yer tutucusu, elle `/admin` yazılınca `/forbidden`; sekme yenilenince oturum korunur; yeni sekmede oturum **yok** (sessionStorage).
5. Faz 1'deki hiçbir mevcut test kırılmamış olmalı (kırılıyorsa yalnızca kimlik doğrulama gerektiren testlerde `@WithMockUser(roles="ADMIN")` / token ekle; iş mantığı testlerini değiştirme).

## 9. Teslim

Çıktıda şunları ver: (a) değişen/eklenen dosyaların listesi, (b) çalıştırdığın komutlar ve sonuçları, (c) bilinçli sapmalar ve nedenleri, (d) Faz 2B'nin dayanacağı sabit sözleşmeler: rol/endpoint kuralları (§5.1), `CurrentUserPrincipal` alanları, `Clock` bean'i, `AccountLabelService`, `homeFor()` yönlendirmeleri ve `portal/*` yer tutucu rotaları.
````

---

## FAZ 2B — Gerçek Dünya RBAC Portalları ve İş Akışları

````markdown
# FAZ 2B — Gerçek Dünya RBAC Portalları ve İş Akışları

Sen kıdemli bir full-stack mühendissin (Spring Boot 3.5 / Java 21 / PostgreSQL 16 / Flyway / Angular 21). Bu görevi tek seferde, derlenen ve testleri geçen bir halde teslim et. **Varsayım yapma:** aşağıdaki tablo/sütun/sınıf adları örnektir; gerçek adları önce repodan oku.

## 0. Proje değişmezleri (tüm fazlar için geçerli)

- Veritabanı: PostgreSQL 16 + Flyway. `V1__init_schema.sql`, `V2__seed_data.sql` ve (Faz 2A'dan beri) `V3`, `V5` **asla düzenlenmez**. Yeni tablo yalnızca yeni migration ile eklenir.
- `spring.jpa.hibernate.ddl-auto=validate` kalır; her yeni tablo için entity birebir uyumlu olmalı.
- Backend paketi `tr.edu.nobel`; katmanlar: `config`, `controller`, `dto/request`, `dto/response`, `entity`, `exception`, `mapper`, `repository`, `service`. SOLID: controller yalnızca HTTP/DTO, iş kuralı service'te, service'ler arayüz + `Impl` (projedeki kalıbı izle), constructor injection.
- DTO izolasyonu: entity API'ye çıkmaz. Hatalar mevcut `GlobalExceptionHandler` + hata DTO'suyla döner; yeni hata formatı icat etme.
- Frontend: Angular 21, standalone, Reactive Forms, `inject()` + signal, UI metinleri Türkçe. Mevcut test altyapısını kullan; backend entegrasyon testleri gerçek PostgreSQL (Testcontainers `postgres:16`, `@ServiceConnection`) ile çalışır.

## 1. Önceki Fazdan Devralınan Durum (Faz 1 + Faz 2A — çalışır halde)

- DB: `V1`, `V2`, `V3` (`kullanici` + `sistem_ayari`; `sistem_ayari`'nda `GIZLILIK_MODU='SEFFAF'` satırı var, henüz entity'si yok), `V5` (demo hesaplar: `admin/admin123`; `kurulus_cern`, `uzman_1`, `uzman_2`, `uzman_3`, `aday_1` / `123456`; üç uzman V2'deki ilk komitenin üyesi). `spring.flyway.out-of-order=true` açık olduğu için **`V4` artık `V5`'ten sonra uygulanabilir**.
- Backend: Spring Security + JWT (stateless). `SecurityConfig` rol kurallarını **zaten içerir**: `/api/admin/**`→ADMIN, `/api/portal/kurulus/**`→KURULUS, `/api/portal/aday/**`→ADAY, `/api/portal/uzman/**`→UZMAN. `CurrentUserPrincipal(kullaniciId, kullaniciAdi, rol, kurulusNo, adayId, uzmanId)` controller'larda `@AuthenticationPrincipal` ile gelir. `Clock` bean'i (`nobel.time-zone`), `AccountLabelService`, `Kullanici`/`KullaniciRepository`, `PasswordEncoder`, JSON 401/403 işleyicileri hazır. `RegistryController` ve `CommitteeController` sınıf düzeyinde ADMIN korumalı.
- Frontend: `/login`, `authGuard`, `roleGuard(...)`, `authInterceptor`, `AuthService` (token `sessionStorage`'da), `AdminShellComponent` altında 5 yönetim ekranı; `/portal/kurulus|aday|uzman` rotaları `PortalPlaceholderComponent`'e gidiyor.

## 2. Bu Fazın Kapsam Sınırı (YAPILMAYACAKLAR)

- SSE, `/api/events/stream`, `DomainEventPublisher`, `@TransactionalEventListener`, ER diyagramı, `/live-stage`, mini dock, karakter/animasyon **yok**. Bu fazda yalnızca saf Spring `ApplicationEvent` POJO'ları (`tr.edu.nobel.event`) yayınlanır; **dinleyicisi bu fazda yoktur** (Faz 3A dinleyecek).
- `SecurityConfig`'e dokunulmaz (kurallar 2A'da hazır). `V1/V2/V3/V5`'e dokunulmaz.
- Mevcut `RegistryController`/`CommitteeController`/`RegistryService`/`CommitteeService` ve 5 admin ekranı değişmez (yalnızca admin menüsüne bir "Ayarlar" sekmesi eklenir).
- Şifre değiştirme/sıfırlama, e-posta gönderimi, aday profil notu güncelleme, demo sıfırlama, kullanıcı yönetimi **yok**.
- `degerlendirme` tablosuna V4 dışında şema değişikliği yok.

## 3. Keşif (kod yazmadan önce oku, kısa bir "Keşif Notu" yaz)

`V1`'den: `aday` (zorunlu sütunlar), `odul` (`kategori_id`), komite tablosu (`kategori_id`), `komite_uyesi` (**PK/UNIQUE tam olarak (komite_id, uzman_id) üzerinde mi?** Bileşik FK için gerekli), `aday_gosterme` (PK, `tarih`/`saat` sütunları), `degerlendirme` (sütunlar, PK, **karar/sonuç sütununun izin verdiği değerler**, `olcut`, `tarih`/`saat`), trigger'ların fonksiyon gövdeleri. `V2`'den: seed verisinin kategori–komite–ödül eşleşmeleri ve ölçüt değerleri. Kod: mevcut `Aday*` DTO/validasyonları (yeni aday oluştururken **aynı kuralları** kullan), `GlobalExceptionHandler`'daki `DataIntegrityViolationException` eşlemesi, mevcut exception sınıfları (`NotFound`, `Conflict` vb.), Angular'daki `Aday` modeli ve `AdayService`.

## 4. Veritabanı — `V4__expert_voting.sql`

```sql
CREATE TABLE uzman_oyu (
    oy_id     BIGSERIAL PRIMARY KEY,
    komite_id BIGINT NOT NULL,
    uzman_id  BIGINT NOT NULL,
    aday_id   BIGINT NOT NULL REFERENCES aday(aday_id) ON DELETE CASCADE,
    olcut     VARCHAR(255) NOT NULL,
    karar     VARCHAR(30)  NOT NULL,
    oy_zamani TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_uzman_oyu_karar CHECK (karar IN ('KABUL','RED','INCELEMEDE')),
    CONSTRAINT fk_uzman_oyu_komite_uyesi FOREIGN KEY (komite_id, uzman_id)
        REFERENCES komite_uyesi (komite_id, uzman_id) ON DELETE CASCADE,
    CONSTRAINT uq_uzman_oyu UNIQUE (komite_id, uzman_id, aday_id)
);
CREATE INDEX ix_uzman_oyu_komite_aday ON uzman_oyu (komite_id, aday_id);
```

Bileşik FK, **veritabanı seviyesinde** "komitenin üyesi olmayan uzman o komite adına oy kullanamaz" garantisini verir; servis katmanındaki üyelik kontrolü yalnızca daha anlaşılır hata mesajı içindir. Oy değerleri **`KABUL`, `RED`, `INCELEMEDE`** (başka yazım kullanma). Komiteden üye çıkarılırsa (admin) o üyenin oyları cascade ile silinir; bu bilinçli bir davranıştır.

## 5. Backend

### 5.1 Entity / repository / yapılandırma
- `entity/UzmanOyu` (+ `OyKarari` enum), `UzmanOyuRepository` (komite+aday için oy listesi/sayısı, uzman+komite+aday için var mı).
- `config/EvaluationProperties` (`nobel.evaluation.quorum`, varsayılan **3**).
- `entity/SistemAyari` + `SistemAyariRepository` (V3'te hazır tablo); `PrivacyMode` enum (`SEFFAF`, `GIZLI`).
- Mevcut komite repository'sine "satırı kilitleyerek getir" (`@Lock(PESSIMISTIC_WRITE)`) metodu ekle.

### 5.2 Sabit kural: tarih/saat sunucudan
Portal akışlarında `tarih` ve `saat` **istek gövdesinde asla yoktur**; `LocalDate.now(clock)` / `LocalTime.now(clock)` ile servis mühürler. (Admin panelindeki ham CRUD formları eskisi gibi tarih/saati elle girmeye devam eder.)

### 5.3 Kuruluş akışı — Find-or-Create (çift kayıt tuzağını önler)
`NominationWorkflowService` (`@Transactional`), yalnızca `CurrentUserPrincipal.kurulusNo` ile çalışır (kuruluş no **asla** istekten gelmez):
- `GET /api/portal/kurulus/oduller` → ödüller + kategori adı.
- `GET /api/portal/kurulus/aday-ara?q=` → ad/soyad/çalışma alanında büyük-küçük harf ve Türkçe karakter duyarsız arama (en az 2 karakter, en çok 20 sonuç); `AdayAramaResponse` (`adayId`, görünen ad, çalışma alanı, `hesapVar`) — hesap/şifre bilgisi **yok**.
- `POST /api/portal/kurulus/aday-gostermeler` gövdesi: `{ "mevcutAdayId": 4 | null, "yeniAday": {…} | null, "odulId": 2 }`. **Tam olarak biri** dolu olmalı (Bean Validation sınıf düzeyinde kural, 400). `yeniAday`, mevcut aday oluşturma DTO'sundaki kuralların aynısını taşır.
  - Mevcut aday: **yeni hesap açılmaz**; yalnızca `aday_gosterme` satırı yazılır.
  - Yeni aday: tek `@Transactional` içinde sırayla `aday` → `kullanici` (`ROLE_ADAY`, kullanıcı adı `aday_<aday_id>`, `CandidateAccountProvisioner` + `TemporaryPasswordGenerator` (`SecureRandom`, 10 karakter, karışabilen karakterler yok) + `PasswordEncoder`) → `aday_gosterme` (sunucu tarih/saati). Düz şifre **yalnızca bu yanıtta, bir kez** döner; loglanmaz, DB'ye düz yazılmaz.
  - Aynı (kuruluş, aday, ödül) tekrar → 409 ve anlaşılır mesaj (varsa PK ihlalini beklemeden `exists` ile kontrol et, PK ihlali ise yine 409'a eşlensin). Olmayan aday/ödül → 404.
  - Yanıt (201): `{ "adayGosterme": {…}, "yeniHesap": { "kullaniciAdi", "geciciSifre" } | null }`.
- `GET /api/portal/kurulus/aday-gostermeler` → **yalnızca kendi** yaptığı adaylıklar (aday, ödül, kategori, tarih, saat, komite sonucu özeti).

### 5.4 Aday portalı ve gizlilik modu
- `GET /api/portal/aday/ozet` → yalnızca `principal.adayId`'ye ait veri: kişi bilgisi + adaylıklar (ödül, kategori, kuruluş, tarih/saat, değerlendirme aşaması/sonucu) + o anki `gizlilikModu`. İstek parametresiyle aday kimliği **alınmaz**.
- `PrivacyModeService`: modu `sistem_ayari`'ndan okur. Maskeleme tek bir sınıfta (`AdayViewMasker` — Strategy: `TransparentMasker`, `NobelSecrecyMasker`) toplanır:
  - **SEFFAF**: kuruluş adı, tarih/saat, aşama ve komite sonucu görünür.
  - **GIZLI**: kuruluş adı `"Gizli Kuruluş"`, tarih/saat `null`, **sonuç `null`**; yalnızca ödül ve aşama (`ADAYLIK_ALINDI` → `KOMITE_INCELEMESINDE` → `KARAR_VERILDI`) görünür.
- `GET /api/admin/ayarlar/gizlilik-modu` ve `PUT /api/admin/ayarlar/gizlilik-modu` (`{ "mod": "SEFFAF" | "GIZLI" }`) — `AdminSettingsController` (ADMIN).

### 5.5 Uzman portalı ve oylama
`EvaluationWorkflowService` (`@Transactional`), yalnızca `principal.uzmanId` ile çalışır:
- `GET /api/portal/uzman/komitelerim` → üyesi olduğu komiteler (kategori, üyeler, bekleyen aday sayısı). Üye olmadığı komite **hiç dönmez**.
- `GET /api/portal/uzman/komiteler/{komiteId}/adaylar` → o komitenin kategorisindeki ödüllere `aday_gosterme` kaydı olan adaylar; her biri için `votesCast`, `votesRequired` (=quorum), `memberCount`, `myVote`, komite arkadaşlarının oyları (uzman etiketi + karar + ölçüt), `finalized` ve varsa nihai karar. Komite üyesi değilse **403**.
- `GET /api/portal/uzman/olcutler` → ölçüt listesi (V1/V2'de ölçüt için bir CHECK/seed kümesi varsa onu kullan; yoksa sabit liste: `Bilimsel Katkı`, `Özgünlük`, `Toplumsal Fayda`, `Etki Düzeyi`).
- `POST /api/portal/uzman/oylar` `{ komiteId, adayId, olcut, karar }`:
  1. Komite satırı `PESSIMISTIC_WRITE` ile kilitlenir (aynı komitede eşzamanlı oylar sıraya girer).
  2. Üyelik doğrulanır (değilse 403; DB bileşik FK ikinci savunma hattı, FK ihlali de 403'e eşlenir).
  3. **Kategori uyumu**: adayın bu komitenin kategorisindeki bir ödülde adaylığı yoksa 422.
  4. Bu aday için o komitede nihai `degerlendirme` varsa 409 ("karar kesinleşti"); aynı uzman tekrar oy verirse 409.
  5. Oy kaydedilir (`oy_zamani` DB varsayılanı/sunucu saati).
  6. **Otomatik kesinleştirme**: `oy sayısı == üye sayısı` olduysa karar hesaplanıp `degerlendirme`'ye yazılır.
  - Yanıt (201): `{ oy, votesCast, votesRequired, memberCount, kararKesinlesti, degerlendirme | null }`.
- `POST /api/portal/uzman/karar-kesinlestir` `{ komiteId, adayId }`: üyelik + kategori + "henüz kesinleşmemiş" kontrollerinden sonra **`oy sayısı ≥ quorum`** ise (üye sayısı quorum'dan büyükse de) kararı manuel kesinleştirir; aksi halde 409.
- **Karar politikası (`DecisionPolicy`, saf sınıf, tablo-testli)**: en çok oy alan değer kazanır; **eşitlikte `INCELEMEDE`**. `degerlendirme`'ye yazılacak karar değeri, V1'deki sütunun izin verdiği değerlere eşleme tablosuyla (tek yerde, `DecisionValueMapper`) çevrilir; `degerlendirme.olcut` = kazanan karara oy verenlerin en sık ölçütü (eşitlikte alfabetik ilk); tarih/saat sunucu mührü. `uzman_oyu` kayıtları silinmez (denetim izi).

### 5.6 Olaylar (yalnızca yayın)
`tr.edu.nobel.event` altında `DomainEvent` (arayüz: `occurredAt()`) ve `record`'lar; servisler `ApplicationEventPublisher` ile yayınlar, başka hiçbir şey bilmez:
- `NominationRecorded(kurulusNo, kurulusLabel, adayId, adayLabel, odulId, odulLabel, kategoriId, kategoriLabel, boolean yeniAdayHesabiAcildi, occurredAt)`
- `ExpertVoted(komiteId, komiteLabel, kategoriLabel, uzmanId, uzmanLabel, adayId, adayLabel, karar, olcut, votesCast, votesRequired, memberCount, List<MemberRef(uzmanId,label)> members, List<VoteRef(uzmanId,karar)> votes, occurredAt)`
- `DecisionFinalized(komiteId, komiteLabel, adayId, adayLabel, karar, kabul, red, incelemede, boolean otomatik, List<MemberRef> members, occurredAt)`
- Olaylardaki `karar` değerleri **her zaman `KABUL | RED | INCELEMEDE`**'dir (`degerlendirme` sütununa yazılan eşlenmiş değerden bağımsız).
Etiketler `AccountLabelService`/varlık adlarından, **servis içinde (aynı transaction'da)** hesaplanır; böylece dinleyici sonradan veritabanına gitmek zorunda kalmaz. Düz şifre veya hash hiçbir olayda yer almaz.

### 5.7 DTO / mapper / hata eşlemesi
Tüm yanıtlar `dto/response` altında ayrı sınıflardır (`KurulusAdayGostermeResponse`, `YeniHesapResponse`, `AdayOzetResponse`, `AdayGostermeGorunumResponse`, `UzmanKomiteResponse`, `KomiteAdayResponse`, `OyResponse`, `OyKararResponse`…); mapper'lar `mapper/` altında. Durum kodları: 400 doğrulama, 403 sahiplik/üyelik, 404 yok, 409 çakışma/kesinleşmiş/mükerrer, 422 kategori uyumsuz. `GlobalExceptionHandler`'a yalnızca eksik eşlemeler eklenir.

## 6. Frontend

- `core/models/portal.models.ts`, `core/services/kurulus-portal.service.ts`, `aday-portal.service.ts`, `uzman-portal.service.ts`, `core/services/admin-settings.service.ts` — tipli, DTO'larla birebir.
- `features/portal/portal-shell/portal-shell.component.*`: üst çubuk (rol rozeti, `displayName`, "Çıkış"), içerik `<router-outlet />`. Rotalar (`portal/kurulus|aday|uzman`) `PortalShellComponent` altında çocuk olur ve yer tutucu yerine gerçek sayfaya bağlanır; `roleGuard` kalır. `PortalPlaceholderComponent` silinir.
- **Kuruluş sayfası** (`features/portal/kurulus`): (1) debounce'lu (`valueChanges` + `debounceTime` + `switchMap`) aday arama kutusu; sonuçtan seçim **veya** "Listede yok → yeni aday" Reactive Form'u (mevcut aday formunun doğrulamalarıyla); (2) ödül seçimi (kategoriye göre gruplanmış); (3) gönder. Başarıda yeni hesap açıldıysa kullanıcı adı + geçici şifre **tek seferlik, kopyalanabilir kartta** gösterilir, kart kapatılınca bellekten silinir; (4) "Yaptığım Adaylıklar" tablosu (sunucu tarih/saati dahil). Tarih/saat alanı **formda yoktur**.
- **Aday sayfası**: "Aday Gösterildiğim Ödüller" ve "Komite Değerlendirme Sonuçlarım" kartları; `GIZLI` modda maskelenmiş alanlar "Gizli" rozetiyle gösterilir, mod rozeti görünür. Salt okunur.
- **Uzman sayfası**: komite listesi → seçilen komitede adaylar; her aday için oy paneli (ölçüt seçimi + `KABUL`/`RED`/`INCELEMEDE` düğmeleri), **oy doluluk göstergesi** (`n / votesRequired` nokta/çubuk), komite arkadaşlarının oyları, "Kararı Kesinleştir" düğmesi (yalnızca `votesCast ≥ votesRequired` ve kesinleşmemişken etkin), kesinleşince nihai karar rozeti. Oy sonrası liste yenilenir; 403/409/422 mesajları kullanıcıya Türkçe gösterilir.
- **Admin → Ayarlar sekmesi** (`/admin/ayarlar`): gizlilik modu anahtarı (`SEFFAF`/`GIZLI`), `AdminShellComponent` menüsüne eklenir.
- Tüm formlar Reactive Forms, `ChangeDetectionStrategy.OnPush`, yükleniyor/boş/hata durumları işlenmiş olmalı.

## 7. Testler (hepsi yeşil olmalı)

Backend (birim): `DecisionPolicyTest` (tablo-testli: 3-0, 2-1, 1-1-1 eşitlik→INCELEMEDE, 2 KABUL+1 INCELEMEDE, 5 üyeli kombinasyonlar), `NominationWorkflowServiceTest` (mevcut aday → yeni hesap **açılmaz**; yeni aday → aday+kullanıcı+aday_gosterme; tarih/saat sahte `Clock` ile mühürlenir; kuruluş no principal'dan), `AdayViewMaskerTest` (iki mod), `TemporaryPasswordGeneratorTest`.
Backend (entegrasyon, gerçek PostgreSQL):
1. `UzmanOyuSchemaIT`: üyesi olmayan uzman için **doğrudan JDBC INSERT** → FK ihlali (DB seviyesinde garanti kanıtı); aynı (komite, uzman, aday) ikinci kez → UNIQUE ihlali; geçersiz `karar` → CHECK ihlali.
2. `PortalSecurityIT`: KURULUS token'ı ile `/api/portal/uzman/**` → 403; UZMAN ile `/api/portal/kurulus/**` → 403; ADAY ile `/api/admin/**` → 403; başka kuruluşun adaylığı listede görünmez; aday yalnızca kendi özetini görür.
3. `EndToEndWorkflowIT` (aşağıdaki senaryo).
4. `PrivacyModeIT`: admin `GIZLI` yapar → aday özeti maskeli; `SEFFAF`'a dönünce açık.
5. `ConcurrentVotingIT`: aynı komitede 3 üyenin eşzamanlı oyu → tam bir `degerlendirme` satırı, mükerrer yok.
6. Olay testi: `ApplicationEvents` (Spring `@RecordApplicationEvents`) ile oy/aday gösterme/karar olaylarının yayımlandığı ve içeriğinde şifre/hash olmadığı doğrulanır.

Frontend: portal servisleri (URL/gövde), kuruluş formu (XOR kuralı, tarih alanı yok), oy doluluk göstergesi bileşeni, aday sayfası maskeli görünüm, `roleGuard` yönlendirmeleri için birim testleri.

## 8. Doğrulama senaryosu (EndToEnd — hem IT'de hem elle koştur)

1. `kurulus_cern` girişi → `GET oduller`; **uzman_1'in komitesinin kategorisindeki** bir ödülü seç → `POST aday-gostermeler` (`yeniAday` dolu) → 201, yanıtta `yeniHesap` var; `aday_gosterme` satırında tarih/saat sunucu zamanı.
2. Aynı kişiyi bu kez başka bir ödül için `mevcutAdayId` ile öner → **yeni `kullanici` satırı oluşmaz** (`SELECT count(*) FROM kullanici WHERE aday_id = …` hâlâ 1).
3. Yeni hesapla giriş → `GET aday/ozet`: adaylıklar görünür, sonuç "beklemede".
4. `uzman_1`, `uzman_2` oy verir → `votesCast` 1/3, 2/3; henüz `degerlendirme` yok. `uzman_3` oy verir → 3/3, `kararKesinlesti=true`, `degerlendirme`'de tek satır (2 KABUL + 1 RED → KABUL).
5. Negatifler: komite dışı uzmanla oy → 403; aynı uzman ikinci oy → 409; kesinleşmiş adaya yeni oy → 409; kategori dışı aday → 422; `kurulus_cern` ile `/api/portal/uzman/oylar` → 403; `uzman_1` ile `aday/ozet` → 403.
6. Admin `GIZLI` → aday özeti maskeli; `SEFFAF` → açık.
7. Faz 2A'daki `/admin` testleri ve Faz 1 trigger testleri **hâlâ yeşil**; `SELECT version FROM flyway_schema_history ORDER BY installed_rank` → Faz 2A'dan kalma veritabanında `1,2,3,5,4` (out-of-order), sıfırdan kurulan veritabanında `1,2,3,4,5`; her iki durumda da hepsi `success=true` ve uygulama açılışında `validate` hatası yok.
8. Tarayıcıda üç sekme: kuruluş / uzman / aday girişleri **birbirinin oturumunu bozmadan** aynı anda çalışır; frontend derlemesi ve testleri yeşil.

## 9. Teslim

(a) Değişen/eklenen dosyalar, (b) çalıştırdığın komutlar ve sonuçları, (c) bilinçli sapmalar (özellikle `degerlendirme` karar değeri eşlemesi ve ölçüt kümesi kararın), (d) **Faz 3A için sabit sözleşmeler**: `tr.edu.nobel.event.*` olay sınıfları ve alanları, portal endpoint listesi, `PrivacyModeService`, servislerin yayın noktaları.
````

---

## FAZ 3A — Canlı Olay Akışı (SSE) ve İnteraktif SVG ER Diyagramı

````markdown
# FAZ 3A — Canlı Olay Akışı (SSE) ve İnteraktif SVG ER Diyagramı

Sen kıdemli bir full-stack mühendissin (Spring Boot 3.5 / Java 21 / PostgreSQL 16 / Angular 21). Bu görevi tek seferde, derlenen ve testleri geçen bir halde teslim et. **Varsayım yapma:** aşağıdaki sınıf/tablo/kaynak adları örnektir; gerçek adları önce repodan oku.

## 0. Proje değişmezleri (tüm fazlar için geçerli)

- `V1`–`V5` migration'ları düzenlenmez; **bu fazda yeni migration yok** (olaylar veritabanına yazılmaz, bellekte tutulur). `ddl-auto=validate` kalır.
- Backend paketi `tr.edu.nobel`; katmanlar `config`, `controller`, `dto/request`, `dto/response`, `entity`, `exception`, `mapper`, `repository`, `service`. SOLID: yeni davranış mevcut sınıfları değiştirmeden **ekleme** ile gelir (Open/Closed); iş servisleri animasyon/SSE sistemini bilmez.
- DTO izolasyonu: SSE yükü ayrı DTO'lardır; entity sızmaz. Hatalar mevcut `GlobalExceptionHandler` formatındadır.
- Frontend: Angular 21, standalone, `inject()` + signal, UI metinleri Türkçe. Mevcut test altyapısını kullan; backend entegrasyon testleri gerçek PostgreSQL (Testcontainers `postgres:16`, `@ServiceConnection`).

## 1. Önceki Fazdan Devralınan Durum (Faz 1 + 2A + 2B — çalışır halde)

- Auth/JWT, rol kuralları (`SecurityConfig`), `AccountLabelService`, `Clock` bean'i, `/admin` altında 5 yönetim ekranı + Ayarlar sekmesi, `PortalShellComponent` altında Kuruluş/Aday/Uzman portalları, `AdminShellComponent`.
- Faz 2B servisleri `ApplicationEventPublisher` ile **dinleyicisi olmayan** olaylar yayınlar (`tr.edu.nobel.event`): `DomainEvent` (arayüz, `occurredAt()`), `NominationRecorded`, `ExpertVoted` (üyeler + o ana kadarki oylar dahil), `DecisionFinalized`. Etiketler (kuruluş/aday/uzman/komite adları) olaylarda hazırdır; düz şifre/hash olaylarda yoktur. Olaylardaki `karar` değerleri her zaman `KABUL | RED | INCELEMEDE`'dir.
- Admin ham CRUD'u (`RegistryService`, `CommitteeService`) **olay yayınlamaz**; PostgreSQL trigger/constraint hataları `GlobalExceptionHandler`'da HTTP hatasına çevrilir ama olay yayınlamaz.
- Veritabanı trigger'ları: komitede en az 3 uzman (deferred constraint trigger; ihlal `COMMIT` anında patlar — hata, servis metodundan değil transaction commit'inden gelir; `GlobalExceptionHandler`'ın bunu nasıl yakaladığını Keşif'te doğrula).

## 2. Bu Fazın Kapsam Sınırı (YAPILMAYACAKLAR)

- **Portfolyo karakter kodu, `NobelCharacterAdapter`, sprite/PNG, karakter animasyonu yok** (Faz 3B). Bu faz yalnızca `PortfolioStageAdapter` **sözleşmesini**, bir `NoopStageAdapter`'ı ve onu barındıran `CharacterStageComponent` kabuğunu yazar.
- V1–V5, 2A/2B iş mantığı (`NominationWorkflowService`, `EvaluationWorkflowService`, `AuthService` …), `RegistryService`, `CommitteeService`, mevcut controller URL'leri **değişmez**. İzin verilen tek dokunuşlar: `SecurityConfig`'e iki `permitAll` satırı, `GlobalExceptionHandler`'a olay yayını, `application.yml`'e ayarlar, `AdminShell`/`PortalShell`'e dock etiketi, `app.routes.ts`'e `/live-stage`.
- Olayları kalıcılaştırma (DB/Redis/Kafka), çoklu sunucu (cluster) yayını, WebSocket yok.
- Oturum açma/çıkma olayları yayınlanmaz (gizlilik).

## 3. Keşif (kod yazmadan önce oku, kısa bir "Keşif Notu" yaz)

`V1` FK'ları (ER topolojisini doğrula: aşağıdaki 6 varlık + 5 ilişki ve 11 kenar varsayımı), `RegistryController` kaynak adları ↔ tablo eşlemesi, `RegistryService`/`CommitteeService` public mutasyon metotları, `GlobalExceptionHandler` (özellikle `DataIntegrityViolationException`, `TransactionSystemException`, PSQLException `SQLState`/mesajı: trigger ihlali hangi istisnayla ve hangi mesajla geliyor), `SecurityConfig`, `app.config.ts`, `app.routes.ts`, `AdminShellComponent`, `PortalShellComponent`, tema değişkenleri/global stil.

## 4. SABİT SÖZLEŞME — Olay JSON'u (backend → frontend, Faz 3B de buna dayanır)

```json
{
  "eventId": "evt-9042",
  "timestamp": "2026-11-21T14:32:10",
  "action": "EXPERT_VOTED",
  "actorRole": "UZMAN",
  "actorLabel": "Prof. Dr. İlker Kaya",
  "sqlSummary": "INSERT INTO uzman_oyu (komite_id=1, uzman_id=2, aday_id=4, karar='KABUL')",
  "erHighlight": {
    "nodes": ["UZMAN","uyesidir","DEGERLENDIRME_KOMITESI","degerlendirir","ADAY"],
    "edges": ["UZMAN-uyesidir","uyesidir-DEGERLENDIRME_KOMITESI","DEGERLENDIRME_KOMITESI-degerlendirir","degerlendirir-ADAY"],
    "severity": "success"
  },
  "stageCue": {
    "scene": "COMMITTEE_VOTE",
    "committeeId": 1, "committeeLabel": "Fizik Komitesi",
    "expertId": 2, "expertLabel": "Prof. Dr. İlker Kaya",
    "candidateName": "Dr. Selin Arslan",
    "vote": "KABUL", "votesCast": 3, "votesRequired": 3,
    "members": [{"expertId": 1, "label": "…"}, {"expertId": 2, "label": "…"}, {"expertId": 3, "label": "…"}],
    "votes":   [{"expertId": 1, "vote": "KABUL"}, {"expertId": 2, "vote": "KABUL"}]
  }
}
```

- `action` ∈ `NOMINATION_CREATED`, `EXPERT_VOTED`, `DECISION_FINALIZED`, `REGISTRY_CREATED|UPDATED|DELETED`, `COMMITTEE_CREATED|DELETED`, `COMMITTEE_MEMBER_ADDED|REMOVED`, `CONSTRAINT_VIOLATION`.
- `actorRole` ∈ `ADMIN|KURULUS|ADAY|UZMAN|SYSTEM`; `severity` ∈ `success|info|error` (oluştur/güncelle/iş akışı = `success`, sil = `info`, trigger/constraint ihlali = `error`).
- `stageCue` yalnızca sahnelenecek olaylarda dolu, diğerlerinde `null` (JSON'da alan yok). `scene` ∈ `NOMINATION | COMMITTEE_VOTE | DECISION_FINALIZED | CONSTRAINT_ERROR` (`IDLE` frontend'in varsayılan durumudur, sunucu göndermez). Sahne başına alanlar:
  - `NOMINATION`: `organizationLabel`, `candidateName`, `awardLabel`, `categoryLabel`, `newAccount` (boolean)
  - `COMMITTEE_VOTE`: yukarıdaki örnek (`vote` ∈ `KABUL|RED|INCELEMEDE`)
  - `DECISION_FINALIZED`: `committeeId`, `committeeLabel`, `candidateName`, `result` (`KABUL|RED|INCELEMEDE`), `tally {kabul, red, incelemede}`, `members[]`
  - `CONSTRAINT_ERROR`: `message` (kullanıcıya gösterilecek Türkçe kısa metin, örn. "PostgreSQL Trigger: En az 3 uzman gerekli!"), isteğe bağlı `committeeId`, `committeeLabel`, `memberCount`, `expertLabel`, `members[]` (bağlam çözülebiliyorsa)
- Backend'de `ActivityEventDto`, `ErHighlightDto`, `StageCueDto` (`@JsonInclude(NON_NULL)`, tek düz kayıt) `dto/response/activity` altında; `eventId` bellek içi `AtomicLong` sıralamasından (`evt-<n>`).

### ER topolojisi (kimlikler değişmez; 6 varlık + 5 ilişki = 11 düğüm, 11 kenar)

Varlık kimlikleri: `KURULUS, ADAY, ODUL, KATEGORI, DEGERLENDIRME_KOMITESI, UZMAN`. İlişki kimlikleri: `aday_gosterir, kategorisine_aittir, olusturulur, degerlendirir, uyesidir`.
Kenar kimliği `"<kaynak>-<hedef>"`: `KURULUS-aday_gosterir`, `aday_gosterir-ADAY`, `aday_gosterir-ODUL`, `ODUL-kategorisine_aittir`, `kategorisine_aittir-KATEGORI`, `KATEGORI-olusturulur`, `olusturulur-DEGERLENDIRME_KOMITESI`, `DEGERLENDIRME_KOMITESI-degerlendirir`, `degerlendirir-ADAY`, `UZMAN-uyesidir`, `uyesidir-DEGERLENDIRME_KOMITESI`.
V1'deki FK'lar bu topolojiyle çelişiyorsa (örn. `olusturulur`'un bağladığı varlıklar) **yalnızca** o kenarı düzelt ve nedenini teslim notuna yaz; kimlik adlarını değiştirme.

Işıklandırma kataloğu (`ErHighlightCatalog`, backend):
| Olay | nodes | severity |
|---|---|---|
| NOMINATION_CREATED | KURULUS, aday_gosterir, ADAY, ODUL (+ 3 kenar) | success |
| EXPERT_VOTED | UZMAN, uyesidir, DEGERLENDIRME_KOMITESI, degerlendirir, ADAY (+ 4 kenar) | success |
| DECISION_FINALIZED | DEGERLENDIRME_KOMITESI, degerlendirir, ADAY (+ 2 kenar) | success |
| REGISTRY_* | kaynağın varlık düğümü (aday_gosterme → KURULUS, aday_gosterir, ADAY, ODUL; degerlendirme → DEGERLENDIRME_KOMITESI, degerlendirir, ADAY) | success / info |
| COMMITTEE_CREATED/DELETED | KATEGORI, olusturulur, DEGERLENDIRME_KOMITESI | success / info |
| COMMITTEE_MEMBER_ADDED/REMOVED | UZMAN, uyesidir, DEGERLENDIRME_KOMITESI | success / info |
| CONSTRAINT_VIOLATION | komite/uzman bağlamlıysa UZMAN, uyesidir, DEGERLENDIRME_KOMITESI; değilse ihlal edilen tablonun düğümü; çözülemezse boş | error |

Frontend bir kenarı, kimliği `edges` içinde **veya** iki ucu da `nodes` içinde olduğunda yakar. Bilinmeyen kimlik yok sayılır (geliştirme modunda `console.warn`).

## 5. Backend

### 5.1 Yeni olaylar ve yayın noktaları (mevcut servisleri değiştirmeden)
- `tr.edu.nobel.event` altına: `AdminMutationEvent(resource, operation[CREATED|UPDATED|DELETED], entityId, actorRole, actorLabel, occurredAt)`, `CommitteeChangeEvent(operation[CREATED|DELETED|MEMBER_ADDED|MEMBER_REMOVED], komiteId, uzmanId?, komiteLabel, uzmanLabel?, actorLabel, occurredAt)`, `ConstraintViolationEvent(sqlState, constraintName?, message, komiteId?, actorLabel?, occurredAt)`; hepsi `DomainEvent`.
- **`AdminActivityAspect`** (Spring AOP; `spring-boot-starter-aop` yoksa ekle): `RegistryService` ve `CommitteeService`'in mutasyon metotlarını `@AfterReturning` ile sarar (metot adlarını Keşif'te çıkar; kural metot adı kalıbı değil açık pointcut listesi olsun), olay yayınlar. Aktör, `SecurityContextHolder`'dan `CurrentUserPrincipal` → `AccountLabelService`. Servis kodu **değişmez**.
- `GlobalExceptionHandler`: `DataIntegrityViolationException` / commit anında gelen `TransactionSystemException` (kök neden `PSQLException`) yakalandığında **yanıt davranışı aynı kalır**, ayrıca `ConstraintViolationEvent` yayınlanır. `ConstraintViolationClassifier` (ayrı sınıf): SQLState (`P0001`, `23503`, `23505`, `23514`…), kısıt adı ve mesajdan "komite/uzman bağlamı mı?" kararı verir; istek yolundan `komiteId` çıkarılabiliyorsa (örn. `/komite…/{id}`) komite üyelerini **kısa bir salt-okunur sorguyla** ekler (başarısız olursa bağlamsız yayınla). Sorgu hatası asla asıl HTTP yanıtını bozmaz.
- İş hatası (404/409/422/403, doğrulama) **olay üretmez**; yalnızca veritabanı kaynaklı kısıt/trigger ihlali `CONSTRAINT_VIOLATION` olur.

### 5.2 Dinleme ve haritalama (SRP + Open/Closed)
- `service/DomainEventPublisher`: tek `@TransactionalEventListener(phase = AFTER_COMMIT, fallbackExecution = true)` metodu `DomainEvent` arayüzünü dinler (commit sonrası olaylar ve transaction'sız `ConstraintViolationEvent` için). Geri alınan transaction'ın olayı **asla** yayınlanmaz. Tüm hatalar yakalanıp loglanır; SSE sorunu iş transaction'ını veya HTTP yanıtını asla etkilemez.
- `mapper/activity/ActivityEventMapper<E extends DomainEvent>` arayüzü + olay başına bir uygulama (`NominationActivityMapper`, `ExpertVoteActivityMapper`, `DecisionActivityMapper`, `AdminMutationActivityMapper`, `CommitteeChangeActivityMapper`, `ConstraintViolationActivityMapper`); `ActivityEventFactory` ilgili mapper'ı seçer (yeni olay = yeni mapper, mevcut kod değişmez). `ErHighlightCatalog` ve `SqlSummaryFormatter` ayrı, saf sınıflardır.
- `sqlSummary`: okunabilir tek satır; yalnızca beyaz listedeki sütun/değerler (id, karar, ölçüt…). **Şifre, hash, geçici şifre asla**; hesap oluşumu `INSERT INTO kullanici (kullanici_adi='aday_9', rol='ADAY')` biçiminde özetlenir. Yeni adayla birlikte hesap açıldıysa `NOMINATION_CREATED` olayının `stageCue.newAccount=true`'dur.

### 5.3 Akış
- `EventsProperties` (`nobel.events.buffer-size=50`, `heartbeat-seconds=15`).
- `ActivityEventBuffer`: son N olayı tutan thread-safe halka tampon. `SseBroadcaster`: `CopyOnWriteArrayList<SseEmitter>`, **tek iş parçacıklı gönderim yürütücüsü** (yavaş istemci diğerlerini ve commit sonrası thread'i bloklamasın), `SseEmitter(0L)` (zaman aşımsız), `onCompletion/onTimeout/onError`'da kayıttan düşme, her `heartbeat-seconds` saniyede `: heartbeat` yorum satırı, `@PreDestroy`'da hepsini kapatma.
- `controller/ActivityStreamController`:
  - `GET /api/events/stream` → `text/event-stream`; ilk satırda `retry: 3000`; her olay `id: <eventId>`, `event: activity`, `data: <ActivityEventDto JSON>`; `Last-Event-ID` başlığı varsa tampondaki **daha yeni** olaylar önce gönderilir; yanıt başlıkları `Cache-Control: no-cache`, `X-Accel-Buffering: no`.
  - `GET /api/events/recent?limit=10` → tampondaki son olaylar (eskiden yeniye), sahne canlandırması için değil, şerit ön-dolumu için.
- **Güvenlik (bilinçli karar)**: `EventSource` `Authorization` başlığı gönderemez ve `/live-stage` projeksiyon ekranıdır → `GET /api/events/stream` ve `GET /api/events/recent` `SecurityConfig`'de `permitAll` (diğer her şey eskisi gibi). Async dispatch'in `anyRequest().authenticated()`'a takılmaması için `ASYNC`/`ERROR` dispatcher tiplerine izin ver. Yük yalnızca zaten ekranda gösterilebilir görünen adları ve beyaz listeli SQL özetini taşır; bunu `SECURITY NOTE` yorumuyla belgele.

## 6. Frontend

### 6.1 Veri katmanı (`core/events/`)
- `activity-event.model.ts`: yukarıdaki sözleşmenin tipleri (`ActivityEvent`, `ErHighlight`, `StageCue` — `scene` ayırıcılı birleşim tipi, alan adları §4 ile birebir; `VoteValue`, `StageMember`, `StageVote`).
- `ActivityStreamService` (`providedIn: 'root'`): `EventSource` sarmalayıcı; ilk abone gelince bağlanır, aboneler bitince kapanır (refCount); `status` signal'i (`connecting | open | reconnecting | closed`); `events$` (ham olaylar, **`eventId` ile tekilleştirilmiş** — yeniden bağlanmada tekrar gelen olaylar yok sayılır), `stageCommands$` (`stageCue` dolu olanlar → `StageCharacterCommand`), `recent` signal'i (son 3 olay, `GET /recent` ile ön-dolu). Test için `EventSource` fabrikası enjekte edilebilir. Dev/`?demo=1` için `inject(event)` metodu (sahte olay beslemek).
- `ErPresenterService`: gelen olayları **sıraya koyup sırayla** sunar; `current` signal'i = şu an ışıklandırılan olay. Bekleme süreleri: `success` 1800 ms, `info` 1400 ms, `error` 2600 ms, olaylar arası 150 ms; kuyrukta 5'ten fazla bekleyen varsa süreleri yarıya indir (hızlı mod). Zamanlama test edilebilir olsun (fake timer / enjekte edilen scheduler).

### 6.2 ER bileşeni (`features/live-stage/er/`)
- `er-topology.ts`: **tek gerçek kaynak** — `ER_NODES` (id, tür, etiket, `cx, cy, w, h`) ve `ER_EDGES` (id, from, to). Önerilen yerleşim, `viewBox="0 0 1100 600"` (varlık dikdörtgeni 160×56; ilişki eşkenar dörtgeni 170×72; KOMİTE 220×56):
  `KURULUS(120,90) · aday_gosterir(340,90) · ADAY(560,90) · ODUL(340,250) · kategorisine_aittir(340,390) · KATEGORI(340,530) · olusturulur(545,530) · DEGERLENDIRME_KOMITESI(780,530) · degerlendirir(780,310) · UZMAN(980,270) · uyesidir(980,410)`. Düğümler üst üste binmemeli; kenarlar düğümlerin içinden geçmemeli (kenarlar çizimde şekillerin **altında** kalır). Etiketler Türkçe ve aksanlı (KURULUŞ, ÖDÜL, KATEGORİ, DEĞERLENDİRME KOMİTESİ; "aday gösterir", "kategorisine aittir", "oluşturulur", "değerlendirir", "üyesidir"), kimlikler ASCII kalır.
- `ErLiveMapComponent` (`app-er-live-map`, OnPush): `highlight = input<ErHighlight | null>(null)`, `compact = input(false)`; saf inline SVG (`@for` ile `ER_NODES/ER_EDGES`). `activeNodes`/`activeEdges` `computed()`. Sınıflar: `.node-active` (altın `drop-shadow` + hafif ölçek), `.node-error` (kırmızı titreşim), `.edge-active` / `.edge-error` (`stroke-dasharray: 8 6` + `@keyframes er-flow { to { stroke-dashoffset: -28 } }` → veri akışı kaynaktan hedefe), pasif durumda soluk koyu yeşil/slate. Renkler CSS değişkeniyle (`--er-gold`, `--er-red`, `--er-stroke`, `--er-fill`), mevcut Nobel temasından türet; yoksa koyu yeşil + altın. `prefers-reduced-motion`: akış/titreşim animasyonları kapanır, vurgu statik kalır. Erişilebilirlik: `role="img"` + o anki etkin düğümleri anlatan dinamik `aria-label`. Ağır kütüphane **yok** (saf CSS).
- `SqlRibbonComponent`: son 3 olayın `sqlSummary`'sini terminal şeridi gibi akıtır (en yeni altta, `severity` renkli), `ActivityStreamService.recent`'tan beslenir.

### 6.3 Sayfa, dock ve sahne sözleşmesi
- **`/live-stage`** (`LiveStageComponent`, lazy, **herkese açık**, tam ekran koyu tema): sol/üstte büyük `ErLiveMapComponent` (girdisi `ErPresenterService.current().erHighlight`), yanında `CharacterStageComponent` alanı, altta `SqlRibbonComponent`, köşede bağlantı durumu rozeti. `?demo=1` iken (yalnızca `isDevMode()`) bir "Demo olaylar" paneli: her `action` için örnek bir olayı (`core/events/demo-fixtures.ts`) `ActivityStreamService.inject()` ile besleyen düğmeler — backend olmadan görsel doğrulama içindir.
- **Mini dock** (`LiveDockComponent`, `app-live-dock`): sağ-alt köşede açılıp kapanan çekmece; açıkken kompakt (`compact`) ER haritası + son olayın tek satırı + "Sahneyi göster" anahtarı (açılınca `CharacterStageComponent`). Açık/kapalı durumu `sessionStorage`'da (try/catch). `AdminShellComponent` ve `PortalShellComponent` şablonlarına eklenir; **tek** `ActivityStreamService` bağlantısını paylaşır.
- **Sahne sözleşmesi** (Faz 3B bunu uygulayacak; **imzaları aynen yaz**): `features/live-stage/stage/stage.contract.ts`
  ```ts
  export type StageScene = 'IDLE' | 'NOMINATION' | 'COMMITTEE_VOTE' | 'DECISION_FINALIZED' | 'CONSTRAINT_ERROR';
  export type VoteValue = 'KABUL' | 'RED' | 'INCELEMEDE';
  /** StageCue'nun (sunucu) birebir yansıması + eventId + severity; scene ayırıcılı birleşim tipi. */
  export type StageCharacterCommand = StageCue & { readonly eventId: string; readonly severity: 'success' | 'info' | 'error' };
  export interface PortfolioStageAdapter {
    mount(container: HTMLElement): void;
    play(command: StageCharacterCommand): void;
    destroy(): void;
  }
  /** Her sahne bileşeni kendi adaptör örneğini ister (dock + sayfa aynı anda açık olabilir). */
  export const STAGE_ADAPTER_FACTORY = new InjectionToken<() => PortfolioStageAdapter>('STAGE_ADAPTER_FACTORY', {
    providedIn: 'root',
    factory: () => () => new NoopStageAdapter(),
  });
  ```
  `NoopStageAdapter`: kapsayıcıya "Karakter sahnesi Faz 3B'de bağlanacak" notu + gelen komutların `scene`/etiket özetini metin olarak listeler (sahne akışını doğrulamak için). `CharacterStageComponent` (`app-character-stage`): `mount()` içinde fabrikadan adaptör üretir, `ActivityStreamService.stageCommands$`'a abone olup her komutu `adapter.play()`'e verir, `ngOnDestroy`'da `destroy()` çağırır ve aboneliği bırakır. Faz 3B yalnızca `STAGE_ADAPTER_FACTORY` sağlayıcısını değiştirecek; bu fazın bileşenleri 3B'de **değişmeyecek**.

## 7. Testler (hepsi yeşil olmalı)

Backend:
1. `ErHighlightCatalogTest`: üretilen tüm `nodes`/`edges` kimlikleri yukarıdaki 11 düğüm/11 kenar kümesinin içinde; her kenarın iki ucu `nodes` listesinde.
2. `ActivityEventFactoryTest`: her olay türü için altın dosya (golden JSON) karşılaştırması; `sqlSummary`'de `sifre`/`hash`/`geciciSifre` geçmez; `stageCue` alanları sahne başına sözleşmeyle uyumlu.
3. `ConstraintViolationClassifierTest`: trigger mesajı/SQLState örnekleri → doğru düğümler ve `severity=error`.
4. `SseBroadcasterTest`: iki abone, biri hata fırlatınca kayıttan düşer ve diğeri etkilenmez; `Last-Event-ID` tekrar oynatımı yalnızca daha yeni olayları gönderir.
5. `ActivityStreamIT` (`RANDOM_PORT`, JDK `HttpClient` + `BodyHandlers.ofLines()` ile gerçek SSE okuma): akışa bağlıyken Faz 2B senaryosunu koştur (kuruluş aday gösterir → 3 uzman oy verir) → sırasıyla `NOMINATION_CREATED`, `EXPERT_VOTED`×3, `DECISION_FINALIZED` gelir, hepsi 2 sn içinde, `eventId` artan. Admin ile 3 üyeli komiteden üye silme → HTTP hata yanıtı **ve** `CONSTRAINT_VIOLATION` (`severity=error`, `stageCue.scene=CONSTRAINT_ERROR`). Yinelenen aday gösterme (409 iş hatası) ve geri alınan transaction **olay üretmez**.
6. Faz 1/2A/2B testlerinin tamamı hâlâ yeşil.

Frontend:
7. `ActivityStreamService` (sahte `EventSource`: ayrıştırma, tekilleştirme, yeniden bağlanma durumu, `stageCommands$` yalnızca `stageCue` doluyken), `ErPresenterService` (sıra, süreler, hızlı mod), `er-topology` bütünlük testi (kimlikler benzersiz, her kenarın uçları mevcut, 11/11 sayısı, backend kataloğundaki kimliklerle aynı küme), `ErLiveMapComponent` (etkin düğüm/kenar sınıfları, `edges` boşken iki ucu etkin kenarın türetilmesi, `error` sınıfı), `CharacterStageComponent` (mount/play/destroy çağrıları; `NoopStageAdapter` metni).

## 8. Doğrulama (çıktılarını teslim notuna yaz)

1. Backend + frontend testleri ve `ng build` yeşil, derleme uyarısı yok.
2. `curl -N localhost:8080/api/events/stream` açıkken (başka terminalde) 2B senaryosunu koştur → `event: activity` satırları akar; 15 sn sessizlikte `: heartbeat` gelir.
3. Tarayıcıda iki sekme: **A** `/live-stage` (oturumsuz açılır), **B** `uzman_1` ile `/portal/uzman`. B'de oy verince A'da sayfa yenilenmeden `UZMAN → uyesidir → DEĞERLENDİRME KOMİTESİ → değerlendirir → ADAY` altın yanar, kenarlarda akış animasyonu görünür, SQL şeridine satır eklenir; 3. oyda `DECISION_FINALIZED` yanar; kuruluş aday gösterince KURULUŞ/aday gösterir/ADAY/ÖDÜL yanar.
4. Admin'de 3 üyeli komiteden üye silmeyi dene → A'da `UZMAN`, `üyesidir`, `DEĞERLENDİRME KOMİTESİ` **kırmızı yanıp söner**, şeritte kırmızı satır.
5. A sekmesinde ağı kesip geri aç → durum rozeti `reconnecting` → `open`; kaçırılan olaylar tekrarlanmadan (tekilleştirilmiş) işlenir.
6. `/live-stage?demo=1` → her demo düğmesi ER'yi ve `NoopStageAdapter` metnini beklenen şekilde günceller; `prefers-reduced-motion` açıkken animasyon yok, vurgu var.
7. `/admin` ve portallarda dock açılır/kapanır, tek SSE bağlantısı kullanılır (DevTools → Network'te tek `stream` isteği).

## 9. Teslim

(a) Değişen/eklenen dosyalar, (b) komutlar ve sonuçları, (c) bilinçli sapmalar (özellikle ER topolojisi düzeltmesi, trigger hatasının yakalanma noktası), (d) **Faz 3B için sabit sözleşmeler**: §4 olay JSON'u ve `StageCue` tipleri, `stage.contract.ts` imzaları, `STAGE_ADAPTER_FACTORY`, `CharacterStageComponent`'in adaptöre ne zaman/nasıl komut verdiği ve ER kimlikleri.
````

---

## FAZ 3B — Portfolyo Karakter Sahnesi Entegrasyonu (`NobelCharacterAdapter`)

````markdown
# FAZ 3B — Portfolyo Karakter Sahnesi Entegrasyonu (`NobelCharacterAdapter`)

Sen kıdemli bir Angular mühendisisin (Angular 21, standalone, signal, OnPush). Bu görevi tek seferde, derlenen ve testleri geçen bir halde teslim et. **Varsayım yapma:** dosya yolları ve tip adları örnektir; önce repodan doğrula. Bu faz **yalnızca frontend**'dir.

## 0. Proje değişmezleri
- Backend, migration'lar, SSE, ER bileşeni ve Faz 3A'nın `CharacterStageComponent`/`ActivityStreamService`/`stage.contract.ts` imzaları **değişmez**.
- Angular 21, standalone, `inject()` + signal, UI metinleri Türkçe, mevcut test altyapısı (Vitest veya Karma). Yeni bağımlılık yok (GSAP/Canvas/WebGL/fizik motoru yasak; yalnızca CSS + signal).
- SOLID: veri/durum (Director) ile görünüm (Component) ile köprü (Adapter) ayrı sınıflardır; Director DOM'u yalnızca `StageHost` arayüzü üzerinden tanır.

## 1. Önceki Fazdan Devralınan Durum (Faz 3A — çalışır halde)
- `/live-stage`, mini dock, `ActivityStreamService` (`stageCommands$`), `ErLiveMapComponent`, `CharacterStageComponent` (adaptörü `STAGE_ADAPTER_FACTORY` ile üretir, `mount/play/destroy` çağırır), varsayılan `NoopStageAdapter`, `/live-stage?demo=1` demo olayları.
- Sözleşme (yolları repodan doğrula: `features/live-stage/stage/stage.contract.ts`, `core/events/activity-event.model.ts`):
  ```ts
  export interface PortfolioStageAdapter { mount(container: HTMLElement): void; play(command: StageCharacterCommand): void; destroy(): void; }
  export type StageCharacterCommand = StageCue & { readonly eventId: string; readonly severity: 'success' | 'info' | 'error' };
  export type VoteValue = 'KABUL' | 'RED' | 'INCELEMEDE';
  export const STAGE_ADAPTER_FACTORY: InjectionToken<() => PortfolioStageAdapter>;
  ```
  `StageCue` alanları (scene ayırıcılı birleşim):
  - `NOMINATION`: `organizationLabel`, `candidateName`, `awardLabel`, `categoryLabel`, `newAccount`
  - `COMMITTEE_VOTE`: `committeeId`, `committeeLabel`, `expertId`, `expertLabel`, `candidateName`, `vote`, `votesCast`, `votesRequired`, `members[{expertId,label}]`, `votes[{expertId,vote}]`
  - `DECISION_FINALIZED`: `committeeId`, `committeeLabel`, `candidateName`, `result`, `tally{kabul,red,incelemede}`, `members[]`
  - `CONSTRAINT_ERROR`: `message`, isteğe bağlı `committeeId`, `committeeLabel`, `memberCount`, `expertLabel`, `members[]`
  Gerçek adlar farklıysa **bu fazın kodunu** onlara uydur; 3A dosyalarını değiştirme.

## 2. Bu Fazın Kapsam Sınırı (YAPILMAYACAKLAR)
- Yeni PNG çizme/üretme yok; yalnızca ekteki rig'in mevcut katmanları kullanılır.
- 3A bileşenleri, `CharacterStageComponent`, `NoopStageAdapter`, sözleşme imzaları, backend ve olay JSON'u değişmez. Tek dokunuş: `app.config.ts`'e `provideNobelCharacterStage()`.
- Sahne aktörlerinde fare/klavye etkileşimi yok (`interactive=false`; burna dokunma, parmak, sakal sürükleme, alan/caret takibi, uyku kapalı). Ses yok.
- Rig'e yalnızca **§5'teki geriye uyumlu yama** yapılır (yeni ifade/aktivite/giriş ekleme); mevcut davranışlar, preset'ler ve tipler silinmez/yeniden adlandırılmaz.

## 3. Rig'in gerçek yapısı (Keşif'te doğrula)
Ekteki `character-rig/` (Angular 21 uyumlu, bağımsız) şunları içerir: `character.types.ts`, `character-assets.config.ts` (**tek gerçek kaynak manifest**: 616×476 tasarım uzayı, `LAYERS`, `EYES`, `ACCESSORIES`, `EXPRESSIONS`, `CHARACTER_PRESETS`), `character-state.machine.ts` (saf reducer), `character-kinematics.math.ts` (bakış/paralaks matematiği), `character-interaction.controller.ts` (DOM olayları + zamanlayıcılar), `character-rig.component.{ts,html,css}` (`app-character-rig`), `caret-tracker.util.ts`, `index.ts` ve `images/*.png`.
- **Katmanlar** (gruplar: `body`, `arm`, `finger`, `head`): `body`, `blue-collar`, `left-arm`, `right-arm`, 8 parmak (`thumb|index|middle|pinkie-left|right`), `face`, `eyebags`, `hair`, `beard`, `mouth`, `mustache`, `nose`, `left/right-eyebrow`, `hard-hat`; gözler ayrıdır: `left/right_eye_white` + `left/right_eye_pupil`; mavi yaka kolları `bluecollar-left/right-arm`.
- **Aksesuarlar** (`config.accessories`, çalışma anında değişince katmanlar yeniden çözülür): `eyebags`, `beard`, `mustache`, `hard-hat`, `blue-collar` (gövdeye bindirilir, kolları kısa kollukla değiştirir, **parmakları gizler**).
- **Göz takibi**: bakış, controller'a gelen `pointer-move` noktasından hesaplanır; `tracking.pointer=false` iken pencere fare olayları dinlenmez ve noktayı programatik vermek gerekir (§5'te `lookAt`).
- **Kol/parmak tuzağı**: kollar `rotate` ile döner (pivot omuz); **parmak katmanları kolla birlikte dönmez** (T-pozunda sabit kalır) → kol döndüren her yeni aktivitede parmaklar CSS ile gizlenir.
- **CSS kanalları**: `translate/rotate/scale` sürekli değerler, `transform` yalnızca `@keyframes`. Yeni animasyonlar bu ayrıma uyar.

## 4. Dosya yerleşimi ve kopyalama
- `character-rig/*.ts|css|html` → `frontend/src/app/features/live-stage/engine/character-rig/` (klasör yapısı aynı; `index.ts` barrel korunur).
- PNG'ler → Angular'ın statik varlık kökü (Angular 21 varsayılanı `frontend/public/`; `angular.json` `assets` ayarını doğrula, `src/assets` kullanılıyorsa orası) altında `assets/characters/`. Kopyalanacak 29 dosya: `body`, `blue-collar`, `bluecollar-left-arm`, `bluecollar-right-arm`, `left-arm`, `right-arm`, `face`, `hair`, `beard`, `mouth`, `mustache`, `nose`, `eyebags`, `hard-hat`, `left_eyebrow`, `right_eyebrow`, `left_eye_white`, `right_eye_white`, `left_eye_pupil`, `right_eye_pupil` ve 8 parmak PNG'si. **Kopyalanmayacak**: `Thumbnail.png`, `mascot-composite.png`, `right_eye.png` (manifestte kullanılmıyor).
- Bütün sahne karakterleri `assetBase: 'assets/characters/'` kullanır (rig varsayılanı `assets/images/`'dir; **değiştirme**, config ile ver).
- Kopyadan sonra proje derlenmeli; rig'in kendi TS/Angular kuralları (strict, `noPropertyAccessFromIndexSignature` vb.) çakışırsa **yalnızca** kopyadaki ilgili satırı uyumlu hâle getir.

## 5. Rig yaması (geriye uyumlu — aynen uygula)

**5.1 `character.types.ts`**
```ts
export type CharacterActivity = 'none' | 'pushing' | 'hauling' | 'rest' | 'raise-right' | 'cheer' | 'strike';
export type CharacterEmote = 'cheer' | 'sad' | 'stern' | 'puzzled';
export type CharacterExpression =
  | 'neutral' | 'attentive' | 'startled' | 'sneezing' | 'asleep' | 'peeking'
  | CharacterEmote;
// CharacterStateCore içine:  readonly emote: CharacterEmote | null;
// CharacterEvent birleşimine: | { readonly type: 'emote'; readonly emote: CharacterEmote | null } | { readonly type: 'startle' }
```

**5.2 `character-state.machine.ts`**: `CORE_INITIAL`'a `emote: null`; `resolveExpression`'da `if (s.startled) return 'startled';` satırından hemen sonra ekle (uyku her şeyi ezer):
```ts
if (s.emote && mode !== 'sleeping') return s.emote;
```
`reduceCharacter`'a:
```ts
case 'emote':
  return patch(state, { emote: event.emote });
case 'startle':
  return state.sleeping ? state : patch(state, { startled: true });
```

**5.3 `character-assets.config.ts`**: `EXPRESSIONS`'a (kaş dönüşü: sol kaşta **+** = iç uç aşağı = kızgın, **−** = iç uç yukarı = üzgün/endişeli; sağ kaşta tersi):
```ts
cheer:   { browLeft: { y: -3, rotate: -6 },  browRight: { y: -3, rotate: 6 },   eyeOpenLeft: 1.12, eyeOpenRight: 1.12, pupilOpacity: 1, transitionMs: 160 },
sad:     { browLeft: { y: 2,  rotate: -14 }, browRight: { y: 2,  rotate: 14 },  eyeOpenLeft: 0.72, eyeOpenRight: 0.72, pupilOpacity: 1, transitionMs: 350 },
stern:   { browLeft: { y: 2,  rotate: 12 },  browRight: { y: 2,  rotate: -12 }, eyeOpenLeft: 0.8,  eyeOpenRight: 0.8,  pupilOpacity: 1, transitionMs: 200 },
puzzled: { browLeft: { y: -5, rotate: -8 },  browRight: { y: 1,  rotate: 6 },   eyeOpenLeft: 1.05, eyeOpenRight: 0.85, pupilOpacity: 1, transitionMs: 220 },
```

**5.4 `character-interaction.controller.ts`** (sınıfa üç genel metot; `CharacterEmote` tipini içe aktar):
```ts
/** Zamanlı irkilme (uykudan uyanmaktan bağımsız). */
startle(): void {
  this.dispatch({ type: 'startle' });
  this.after('startle', this.timing.startleMs, () => this.dispatch({ type: 'startle-end' }));
}
/** holdMs > 0 ise süre sonunda ifade kendiliğinden kalkar; 0 ise null verilene dek kalır. */
emote(kind: CharacterEmote | null, holdMs = 0): void {
  this.clear('emote');
  this.dispatch({ type: 'emote', emote: kind });
  if (kind && holdMs > 0) this.after('emote', holdMs, () => this.dispatch({ type: 'emote', emote: null }));
}
/** Programatik bakış (viewport px). null → hedefsiz. `tracking.pointer=false` ile birlikte kullanılır. */
lookAt(point: Vec2 | null): void {
  this.dispatch(point ? { type: 'pointer-move', point } : { type: 'pointer-leave' });
}
```

**5.5 `character-rig.component.ts`** (`CharacterEmote`, `Vec2` tiplerini içe aktar; mevcut `ready` sinyaliyle kapıla):
```ts
/** undefined = dokunma; null = bakışı bırak; Vec2 = bu viewport noktasına bak. */
readonly gazeTarget = input<Vec2 | null | undefined>(undefined);
readonly emote = input<CharacterEmote | null>(null);
/** Her artışta bir irkilme oynar (0 = yok). */
readonly startleRevision = input(0);
/** Her artışta konuşma (bıyık) animasyonu oynar (0 = yok). */
readonly talkRevision = input(0);
// constructor içinde, mevcut effect'lerin yanına:
effect(() => {
  if (!this.ready()) return;
  const target = this.gazeTarget();
  if (target === undefined) return;
  untracked(() => this.controller?.lookAt(target));
});
effect(() => {
  if (!this.ready()) return;
  const kind = this.emote();
  untracked(() => this.controller?.emote(kind));
});
effect(() => {
  if (!this.ready()) return;
  const rev = this.startleRevision();
  untracked(() => { if (rev > 0) this.controller?.startle(); });
});
effect(() => {
  if (!this.ready()) return;
  const rev = this.talkRevision();
  untracked(() => { if (rev > 0) this.controller?.speak(); });
});
```

**5.6 `character-rig.component.css`** (dosyanın **sonuna**, reduced-motion bloğundan önce; kol poz açıları rig'in kendi kol geometrisinden hesaplanmış ve doğrulanmıştır):
```css
/* ───────────── Nobel sahnesi: kol pozları ───────────── */
.layer[data-layer$='-arm'] {
  transition: rotate 0.32s var(--ease-mechanical, cubic-bezier(0.2, 0.8, 0.2, 1));
}
/* rest: kollar aşağıda (T-pozundan dar, kalabalık sahneye uygun) */
.character:is([data-activity='rest'], [data-activity='raise-right'], [data-activity='strike']) [data-layer='left-arm'] { rotate: -80deg; }
.character[data-activity='rest'] [data-layer='right-arm'] { rotate: 80deg; }
/* raise-right: sağ kol yukarıda (oy kartı); cheer: iki kol V şeklinde yukarıda */
.character[data-activity='raise-right'] [data-layer='right-arm'] { rotate: -58deg; }
.character[data-activity='cheer'] [data-layer='left-arm'] { rotate: 58deg; }
.character[data-activity='cheer'] [data-layer='right-arm'] { rotate: -58deg; }
/* strike: sağ kol tokmak vurur (3 vuruş × 900 ms) */
.character[data-activity='strike'] [data-layer='right-arm'] {
  animation: character-gavel-strike 900ms cubic-bezier(0.3, 0.04, 0.5, 0.98) 3;
}
/* parmaklar kolla dönmez → kol döndüren aktivitelerde gizle */
.character:is([data-activity='rest'], [data-activity='raise-right'], [data-activity='cheer'], [data-activity='strike']) [data-group='finger'] {
  opacity: 0;
  animation: none;
}
/* ifade başına hareket (mevcut nefes/irkilme kurallarından SONRA gelmeli) */
.character[data-expression='cheer'] .stage { animation: character-hop 520ms var(--ease-signature, cubic-bezier(0.2, 0.8, 0.2, 1)) 2; }
.character[data-expression='sad'] .stage { animation: character-slump 2.4s ease-in-out infinite; }

@keyframes character-gavel-strike {
  0%, 38%, 100% { rotate: -62deg; }
  56% { rotate: 22deg; }
  72% { rotate: 6deg; }
}
@keyframes character-hop {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(calc(var(--u) * -16)); }
}
@keyframes character-slump {
  0%, 100% { transform: translateY(calc(var(--u) * 5)); }
  50% { transform: translateY(calc(var(--u) * 8)); }
}
```

## 6. Sahne tasarımı

### 6.1 Roller ve aksesuar planı (`accessoriesFor(role, phase)`)
Roller: `KURULUS` (altın etiket), `ADAY` (turkuaz), `UZMAN` (yeşil), `GUARD` (turuncu; **PostgreSQL trigger'ının kişileştirilmiş hâli**). Temel görünüm `beard + mustache`. Aksesuar değişimleri:
| Durum | Kim | Aksesuar |
|---|---|---|
| Aday gösterme yolu | KURULUS | `+ hard-hat + blue-collar` (kurye üniforması); teslimden sonra çıkar |
| Yeni hesap açıldı | ADAY | `+ hard-hat` (hesap "inşa ediliyor", ~1.8 sn) + "Yeni Hesap!" balonu |
| Oy: RED / karar: RED | oy veren UZMAN / ADAY | `+ eyebags` (yorgun/ciddi), oy sonrası UZMAN'da kalkar |
| Kısıt ihlali | GUARD | her zaman `hard-hat + blue-collar` |

### 6.2 Olay → sahne koreografisi (gözler, aksesuar, prop, ifade)
| Sahne | Koreografi |
|---|---|
| `NOMINATION` | Ödül kürsüsü ve plaket (`awardLabel`) kurulur. KURULUS sol dışarıdan **üniformalı** (`pushing` = kol sallayarak yürür, göğsünde altın **zarf**), bakışı kürsüde; yerine varır. ADAY sağ dışarıdan **zıplayarak** (`hopping`) gelir, varınca **irkilir** (`startleRevision`); bakışları birbirinde. `newAccount` ise ADAY'a baret + "Yeni Hesap!" balonu (konuşma animasyonu). Zarf KURULUS'tan kürsüye **uçar** (yay çizerek), üniforma çıkar, ADAY `cheer` ifadesi verir; alt bantta "Kuruluş → Aday · Ödül · Kategori". |
| `COMMITTEE_VOTE` | `members` kadar UZMAN masanın **arkasında oturur** (ayakları masayla örtülü), ADAY masanın önünde durur; herkes ADAY'a bakar. Oy veren UZMAN **öne çıkar**, bakışı adayda; `raise-right` ile sağ kolunu kaldırır, elinde yeşil/kırmızı/sarı **oy kartı** (✓ / ✗ / ?) ve balon (oy metni); ifade: KABUL `cheer`, RED `stern` + `eyebags`, INCELEMEDE `puzzled`. Diğer uzmanların ve adayın gözleri oy verene döner. 1.5 sn sonra kart masaya bırakılır (masada küçük kart kalır), oy veren yerine döner, masadaki sayaç `1/3 → 2/3 → 3/3` dolar. Önceki oylar (`votes`) sahne ilk kurulurken masada kart olarak gösterilir. |
| `DECISION_FINALIZED` | Başkan (ilk üye) öne çıkar, `strike` ile **tokmak** 3 kez vurur (tokmak kolla birlikte döner). Sonra: KABUL → tüm uzmanlar `cheer` + `cheer` aktivitesi, ADAY `cheer` + göğsünde **madalya** + **konfeti**; RED → uzmanlar `stern`, ADAY `sad` + `eyebags` + başında yağmur **bulutu**; INCELEMEDE → herkes `puzzled`. Alt bantta sonuç ve `tally`. |
| `CONSTRAINT_ERROR` | Komite masası kurulur (üyeler `members`, yoksa `memberCount ?? 3` kadar "Uzman n"). Hedef uzman (`expertLabel` eşleşmesi, yoksa son üye) bakışını çıkışa çevirip masadan **kalkmaya çalışır** (öne yürür). GUARD sağdan **kalkanla** (`≥3`) girer, `pushing` ile iter; kırmızı **flaş**, uzman irkilir ve `sad` ifadesiyle koltuğuna geri döner; alt bantta `message` (kırmızı). Sonra GUARD çıkar. |

Sahneler **sıraya girer** (`SceneQueue`): bekleyen en fazla 4; fazlası eskiden atılır; ≥2 bekleyen varsa süreler yarıya iner; `prefers-reduced-motion` açıksa süreler %15'e iner ve zıplama/konfeti olmaz (rig kendi animasyonlarını zaten kapatır).

### 6.3 Dosyalar (`frontend/src/app/features/live-stage/engine/stage/`)
`stage.models.ts`, `stage.layout.ts`, `stage.accessories.ts`, `stage.timeline.ts`, `stage.director.ts`, `nobel-stage.component.{ts,html,css}`, `nobel-character.adapter.ts`, `nobel-stage.providers.ts` (+ her biri için `*.spec.ts`).

## 7. Kod (aynen uygula; derleme hatası çıkarsa yalnızca ilgili satırı düzelt)

**`stage.models.ts`**
```ts
import type { CharacterActivity, CharacterConfigInput, CharacterEmote, Vec2 } from '../character-rig';
import type { VoteValue } from '../../stage/stage.contract';

export type ActorRole = 'KURULUS' | 'ADAY' | 'UZMAN' | 'GUARD';
export type PropKind = 'envelope' | 'vote-card' | 'gavel' | 'shield' | 'medal' | 'cloud';
export type Backdrop = 'empty' | 'nomination' | 'committee';

export interface MemberRef { readonly expertId: number; readonly label: string; }
export interface ActorProp { readonly kind: PropKind; readonly variant?: VoteValue; }
export interface Banner { readonly text: string; readonly sub?: string; readonly tone: 'info' | 'success' | 'warn' | 'error'; }
export interface Flight { readonly rev: number; readonly from: Vec2; readonly to: Vec2; }

export interface ActorState {
  readonly id: string;
  readonly role: ActorRole;
  readonly label: string;
  /** Sahne yüzdesi; ayak ucu (alt-orta) bu noktaya oturur. */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly z: number;
  readonly moveMs: number;
  readonly hopping: boolean;
  readonly config: CharacterConfigInput;
  readonly activity: CharacterActivity;
  readonly emote: CharacterEmote | null;
  /** 'actor:<id>' | 'prop:podium' | 'prop:table' | 'edge:right' */
  readonly gazeRef: string | null;
  readonly gazeTarget: Vec2 | null | undefined;
  readonly startleRevision: number;
  readonly talkRevision: number;
  readonly bubble: string | null;
  readonly props: readonly ActorProp[];
  readonly tableCard: VoteValue | null;
}
```

**`stage.layout.ts`**
```ts
export const FLOOR_Y = 90;
export const SEAT_Y = 66;   // masanın arkası: bacaklar masayla örtülür
export const FRONT_Y = 88;  // masanın önü: oy verirken / tokmak vururken
export const SLOT = {
  offLeft: { x: -16, y: FLOOR_Y },
  offRight: { x: 116, y: FLOOR_Y },
  organization: { x: 24, y: FLOOR_Y },
  candidate: { x: 50, y: FLOOR_Y },
  podium: { x: 76, y: FLOOR_Y },
} as const;

/** `count` uzmanı masa boyunca ortalı dizer. */
export function seatX(index: number, count: number): number {
  const step = Math.min(18, 62 / Math.max(count, 1));
  return 50 + (index - (count - 1) / 2) * step;
}
```

**`stage.accessories.ts`**
```ts
import type { AccessoryId, CharacterConfigInput } from '../character-rig';
import type { ActorRole } from './stage.models';

export type LookPhase = 'base' | 'delivering' | 'onboarding' | 'rejected';
const BASE: readonly AccessoryId[] = ['beard', 'mustache'];
const UNIFORM: readonly AccessoryId[] = ['hard-hat', 'blue-collar'];

export function accessoriesFor(role: ActorRole, phase: LookPhase = 'base'): readonly AccessoryId[] {
  if (role === 'GUARD') return [...BASE, ...UNIFORM];
  switch (phase) {
    case 'delivering': return role === 'KURULUS' ? [...BASE, ...UNIFORM] : BASE;
    case 'onboarding': return role === 'ADAY' ? [...BASE, 'hard-hat'] : BASE;
    case 'rejected': return ['eyebags', ...BASE];
    default: return BASE;
  }
}

/** Sahne aktörleri etkileşimsizdir: pencere fare/alan takibi ve uyku kapalı, bakış programatiktir. */
export function rigConfig(accessories: readonly AccessoryId[]): CharacterConfigInput {
  return {
    view: 'full',
    accessories,
    assetBase: 'assets/characters/',
    tracking: { pointer: false, fields: false, idleSleep: false },
  };
}
```

**`stage.timeline.ts`**
```ts
export class SceneAbortedError extends Error {
  constructor() { super('Sahne iptal edildi'); this.name = 'SceneAbortedError'; }
}

export class Timeline {
  private aborted = false;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly rejecters = new Set<(error: Error) => void>();

  constructor(private readonly scale: () => number = () => 1) {}

  /** scaled=false: zaman ölçeğinden bağımsız (örn. DOM'un yeni durumu çizmesini beklemek). */
  wait(ms: number, scaled = true): Promise<void> {
    if (this.aborted) return Promise.reject(new SceneAbortedError());
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        this.rejecters.delete(reject);
        resolve();
      }, Math.max(0, scaled ? ms * this.scale() : ms));
      this.timers.add(timer);
      this.rejecters.add(reject);
    });
  }

  abort(): void {
    this.aborted = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    const error = new SceneAbortedError();
    for (const reject of this.rejecters) reject(error);
    this.rejecters.clear();
  }
}

/** Sahneleri sırayla çalıştırır; bekleyen sayısı sınırlıdır (fazlası eskiden atılır). */
export class SceneQueue<T> {
  private readonly pending: T[] = [];
  private running = false;
  private disposed = false;

  constructor(
    private readonly run: (item: T, fast: boolean) => Promise<void>,
    private readonly maxPending = 4,
  ) {}

  push(item: T): void {
    if (this.disposed) return;
    this.pending.push(item);
    while (this.pending.length > this.maxPending) this.pending.shift();
    void this.drain();
  }

  dispose(): void {
    this.disposed = true;
    this.pending.length = 0;
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (!this.disposed && this.pending.length > 0) {
        const item = this.pending.shift() as T;
        try {
          await this.run(item, this.pending.length >= 2);
        } catch (error) {
          if (!(error instanceof SceneAbortedError)) console.error('[nobel-stage]', error);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
```

**`stage.director.ts`** (durum + koreografi; DOM'a yalnızca `StageHost` ile dokunur)
```ts
import { signal } from '@angular/core';
import type { Vec2 } from '../character-rig';
import type { StageCharacterCommand, StageScene } from '../../stage/stage.contract';
import { accessoriesFor, rigConfig, type LookPhase } from './stage.accessories';
import { FLOOR_Y, FRONT_Y, SEAT_Y, SLOT, seatX } from './stage.layout';
import type { ActorRole, ActorState, Backdrop, Banner, Flight, MemberRef } from './stage.models';
import { SceneQueue, Timeline } from './stage.timeline';

export interface StageHost {
  /** 'actor:<id>' | 'prop:podium' | 'prop:table' | 'edge:right' → viewport merkez noktası. */
  centerOf(ref: string): Vec2 | null;
  readonly reducedMotion: boolean;
}
type Cmd<S extends StageScene> = Extract<StageCharacterCommand, { scene: S }>;

export class NobelStageDirector {
  readonly actors = signal<readonly ActorState[]>([]);
  readonly backdrop = signal<Backdrop>('empty');
  readonly plaque = signal('');
  readonly banner = signal<Banner | null>(null);
  readonly pips = signal({ cast: 0, required: 3 });
  readonly flight = signal<Flight | null>(null);
  readonly envelopeOnPodium = signal(false);
  readonly flash = signal(0);
  readonly confetti = signal(0);

  private readonly queue = new SceneQueue<StageCharacterCommand>((cmd, fast) => this.run(cmd, fast));
  private current: Timeline | null = null;
  private committeeKey = '';
  private flightRev = 0;

  constructor(private readonly host: StageHost) {}

  play(cmd: StageCharacterCommand): void { this.queue.push(cmd); }
  destroy(): void { this.queue.dispose(); this.current?.abort(); }

  /** Hareket bitince / yeniden boyutlanınca tüm aktörlerin göz hedeflerini yeniden ölçer. */
  refreshGaze(): void {
    this.actors.update((list) =>
      list.map((a) => (a.gazeRef ? { ...a, gazeTarget: this.host.centerOf(a.gazeRef) ?? undefined } : a)),
    );
  }

  private async run(cmd: StageCharacterCommand, fast: boolean): Promise<void> {
    const t = new Timeline(() => (this.host.reducedMotion ? 0.15 : fast ? 0.5 : 1));
    this.current = t;
    try {
      switch (cmd.scene) {
        case 'NOMINATION': await this.nomination(cmd, t); break;
        case 'COMMITTEE_VOTE': await this.committeeVote(cmd, t); break;
        case 'DECISION_FINALIZED': await this.decision(cmd, t); break;
        case 'CONSTRAINT_ERROR': await this.constraintError(cmd, t); break;
      }
    } finally {
      if (this.current === t) this.current = null;
    }
  }

  /* ───────────── NOMINATION ───────────── */
  private async nomination(c: Cmd<'NOMINATION'>, t: Timeline): Promise<void> {
    this.stageSet('nomination', c.awardLabel);

    // Kurye üniformalı kuruluş temsilcisi, elinde zarf, sol dışarıdan yürür.
    this.spawn('org', 'KURULUS', c.organizationLabel, SLOT.offLeft, { activity: 'pushing', z: 22, props: [{ kind: 'envelope' }] });
    this.dress('org', 'KURULUS', 'delivering');
    this.look('org', 'prop:podium');
    await t.wait(80, false);
    await this.moveTo('org', SLOT.organization, 1400, t);
    this.patch('org', { activity: 'rest' });

    // Aday sağdan zıplayarak gelir.
    this.spawn('candidate', 'ADAY', c.candidateName, SLOT.offRight, { z: 21, hopping: true });
    await t.wait(80, false);
    this.look('candidate', 'actor:org');
    this.look('org', 'actor:candidate');
    await this.moveTo('candidate', SLOT.candidate, 1100, t);
    this.patch('candidate', { hopping: false });
    this.startle('candidate');
    if (c.newAccount) {
      this.dress('candidate', 'ADAY', 'onboarding');
      this.say('candidate', 'Yeni Hesap!');
    }
    await t.wait(900);

    // Zarf kürsüye uçar.
    this.patch('org', { props: [] });
    this.flight.set({
      rev: ++this.flightRev,
      from: { x: SLOT.organization.x, y: FLOOR_Y - 9 },
      to: { x: SLOT.podium.x, y: FLOOR_Y - 13 },
    });
    this.look('org', 'prop:podium');
    this.look('candidate', 'prop:podium');
    await t.wait(1000);
    this.flight.set(null);
    this.envelopeOnPodium.set(true);
    this.dress('org', 'KURULUS', 'base'); // üniforma çıkar
    this.patch('candidate', { emote: 'cheer' });
    this.look('org', 'actor:candidate');
    this.look('candidate', 'actor:org');
    this.banner.set({ text: `${c.organizationLabel} → ${c.candidateName}`, sub: `${c.awardLabel} · ${c.categoryLabel ?? ''}`, tone: 'success' });
    await t.wait(1500);
    this.dress('candidate', 'ADAY', 'base');
    this.patch('candidate', { emote: null, bubble: null });
    await t.wait(500);
  }

  /* ───────────── COMMITTEE_VOTE ───────────── */
  private async committeeVote(c: Cmd<'COMMITTEE_VOTE'>, t: Timeline): Promise<void> {
    const fresh = this.ensureCommittee(`${c.committeeId}:${c.candidateName}`, c.members, c.candidateName);
    this.pips.update((p) => ({ cast: fresh ? c.votes.length : p.cast, required: c.votesRequired }));
    if (fresh) {
      for (const v of c.votes) this.patch(`expert-${v.expertId}`, { tableCard: v.vote }); // önceki oylar masada
      await t.wait(120, false);
    }
    const voterId = `expert-${c.expertId}`;
    const voter = this.get(voterId);
    if (!voter) return; // üye listesinde olmayan uzman: sessizce atla

    this.lookAll('actor:candidate', [voterId, 'candidate']);
    await this.moveTo(voterId, { x: voter.x, y: FRONT_Y }, 650, t, { scale: 0.98, z: 50 }); // öne çık
    this.look(voterId, 'actor:candidate');

    // Aksesuar + ifade + oy kartı
    this.dress(voterId, 'UZMAN', c.vote === 'RED' ? 'rejected' : 'base');
    this.patch(voterId, {
      activity: 'raise-right',
      emote: c.vote === 'KABUL' ? 'cheer' : c.vote === 'RED' ? 'stern' : 'puzzled',
      props: [{ kind: 'vote-card', variant: c.vote }],
    });
    this.say(voterId, c.vote);
    this.lookAll(`actor:${voterId}`, [voterId, 'candidate']); // diğerleri oy verene bakar
    this.look('candidate', `actor:${voterId}`);
    await t.wait(1500);

    // Kartı masaya bırak, yerine dön, sayaç dolsun.
    this.pips.set({ cast: c.votesCast, required: c.votesRequired });
    this.patch(voterId, { activity: 'rest', emote: null, props: [], bubble: null, tableCard: c.vote });
    this.dress(voterId, 'UZMAN', 'base');
    await this.moveTo(voterId, { x: voter.x, y: SEAT_Y }, 650, t, { scale: 0.86, z: 10 });
    this.lookAll('actor:candidate', ['candidate']);
    this.look('candidate', `actor:${voterId}`);
    this.banner.set({ text: `${c.expertLabel}: ${c.vote}`, sub: `${c.candidateName} · ${c.votesCast}/${c.votesRequired} oy`, tone: c.vote === 'RED' ? 'warn' : 'info' });
    await t.wait(500);
  }

  /* ───────────── DECISION_FINALIZED ───────────── */
  private async decision(c: Cmd<'DECISION_FINALIZED'>, t: Timeline): Promise<void> {
    const fresh = this.ensureCommittee(`${c.committeeId}:${c.candidateName}`, c.members, c.candidateName);
    if (fresh) await t.wait(120, false);
    const chair = c.members[0];
    const chairId = chair ? `expert-${chair.expertId}` : '';
    const chairActor = this.get(chairId);
    if (!chairActor) return;

    this.pips.update((p) => ({ cast: p.required, required: p.required }));
    this.lookAll('actor:candidate', ['candidate']);
    await this.moveTo(chairId, { x: chairActor.x, y: FRONT_Y }, 600, t, { scale: 0.98, z: 50 });
    this.patch(chairId, { activity: 'strike', props: [{ kind: 'gavel' }] });
    await t.wait(2800); // 3 vuruş × 900 ms
    this.patch(chairId, { activity: 'rest', props: [] });

    const emote = c.result === 'KABUL' ? 'cheer' : c.result === 'RED' ? 'stern' : 'puzzled';
    for (const m of c.members) {
      this.patch(`expert-${m.expertId}`, { emote, activity: c.result === 'KABUL' ? 'cheer' : 'rest' });
    }
    if (c.result === 'KABUL') {
      this.dress('candidate', 'ADAY', 'base');
      this.patch('candidate', { emote: 'cheer', activity: 'cheer', props: [{ kind: 'medal' }] });
      this.confetti.update((n) => n + 1);
    } else if (c.result === 'RED') {
      this.dress('candidate', 'ADAY', 'rejected');
      this.patch('candidate', { emote: 'sad', props: [{ kind: 'cloud' }] });
    } else {
      this.patch('candidate', { emote: 'puzzled' });
    }
    const label = c.result === 'KABUL' ? 'KABUL EDİLDİ' : c.result === 'RED' ? 'REDDEDİLDİ' : 'YENİDEN İNCELEME';
    this.banner.set({
      text: `${c.candidateName}: ${label}`,
      sub: `${c.tally.kabul} KABUL · ${c.tally.red} RED · ${c.tally.incelemede} İNCELEMEDE`,
      tone: c.result === 'KABUL' ? 'success' : c.result === 'RED' ? 'error' : 'warn',
    });
    await t.wait(3000);
    await this.moveTo(chairId, { x: chairActor.x, y: SEAT_Y }, 600, t, { scale: 0.86, z: 10 });
  }

  /* ───────────── CONSTRAINT_ERROR ───────────── */
  private async constraintError(c: Cmd<'CONSTRAINT_ERROR'>, t: Timeline): Promise<void> {
    const members: readonly MemberRef[] = c.members?.length
      ? c.members
      : Array.from({ length: c.memberCount ?? 3 }, (_, i) => ({ expertId: i + 1, label: `Uzman ${i + 1}` }));
    this.committeeKey = '';
    this.ensureCommittee(`err:${c.eventId}`, members, null);
    await t.wait(120, false);

    const target = members.find((m) => m.label === c.expertLabel) ?? members[members.length - 1];
    const id = `expert-${target.expertId}`;
    const seat = this.get(id);
    if (!seat) return;

    // Uzman masadan kalkıp çıkmaya çalışır.
    this.patch(id, { emote: 'puzzled' });
    this.look(id, 'edge:right');
    await this.moveTo(id, { x: seat.x + 22, y: FRONT_Y }, 800, t, { scale: 0.98, z: 50 });

    // Trigger bekçisi kalkanla girer ve iter.
    this.spawn('guard', 'GUARD', 'PostgreSQL Trigger', SLOT.offRight, { activity: 'pushing', z: 60, props: [{ kind: 'shield' }] });
    await t.wait(80, false);
    this.look('guard', `actor:${id}`);
    await this.moveTo('guard', { x: seat.x + 36, y: FRONT_Y }, 900, t);
    this.flash.update((n) => n + 1);
    this.startle(id);
    this.banner.set({ text: c.message, sub: c.committeeLabel ? `${c.committeeLabel} · ${members.length} üye` : undefined, tone: 'error' });
    this.patch(id, { emote: 'sad' });
    this.look(id, 'actor:guard');
    await this.moveTo(id, { x: seat.x, y: SEAT_Y }, 700, t, { scale: 0.86, z: 10 }); // geri oturur
    await t.wait(1800);
    this.patch(id, { emote: null });
    this.look(id, null);
    await this.moveTo('guard', SLOT.offRight, 900, t);
    this.actors.update((list) => list.filter((a) => a.id !== 'guard'));
  }

  /* ───────────── yardımcılar ───────────── */
  private stageSet(backdrop: Backdrop, plaque = ''): void {
    this.committeeKey = '';
    this.actors.set([]);
    this.backdrop.set(backdrop);
    this.plaque.set(plaque);
    this.banner.set(null);
    this.flight.set(null);
    this.envelopeOnPodium.set(false);
    this.pips.set({ cast: 0, required: 3 });
  }

  /** Aynı komite+aday için sahne zaten kuruluysa false döner (ardışık oylar aktörleri yeniden yaratmaz). */
  private ensureCommittee(key: string, members: readonly MemberRef[], candidate: string | null): boolean {
    if (this.committeeKey === key && this.backdrop() === 'committee') return false;
    this.committeeKey = key;
    this.actors.set([]);
    this.backdrop.set('committee');
    this.banner.set(null);
    this.envelopeOnPodium.set(false);
    members.forEach((m, i) =>
      this.spawn(`expert-${m.expertId}`, 'UZMAN', m.label, { x: seatX(i, members.length), y: SEAT_Y }, { scale: 0.86, z: 10 + i }),
    );
    if (candidate) {
      this.spawn('candidate', 'ADAY', candidate, { x: SLOT.candidate.x, y: FRONT_Y + 4 }, { scale: 0.92, z: 40 });
    }
    return true;
  }

  private get(id: string): ActorState | undefined { return this.actors().find((a) => a.id === id); }

  private patch(id: string, change: Partial<ActorState>): void {
    this.actors.update((list) => list.map((a) => (a.id === id ? { ...a, ...change } : a)));
  }

  private spawn(id: string, role: ActorRole, label: string, at: { x: number; y: number }, extra: Partial<ActorState> = {}): void {
    const actor: ActorState = {
      id, role, label, x: at.x, y: at.y, scale: 1, z: 20, moveMs: 0, hopping: false,
      config: rigConfig(accessoriesFor(role)), activity: 'rest', emote: null,
      gazeRef: null, gazeTarget: undefined, startleRevision: 0, talkRevision: 0,
      bubble: null, props: [], tableCard: null, ...extra,
    };
    this.actors.update((list) => [...list.filter((a) => a.id !== id), actor]);
  }

  /** Aksesuar değişimi: rig `config.accessories` girdisini yeniden çözer. */
  private dress(id: string, role: ActorRole, phase: LookPhase): void {
    this.patch(id, { config: rigConfig(accessoriesFor(role, phase)) });
  }

  private async moveTo(id: string, to: { x: number; y: number }, ms: number, t: Timeline, extra: Partial<ActorState> = {}): Promise<void> {
    this.patch(id, { x: to.x, y: to.y, moveMs: ms, ...extra });
    await t.wait(ms + 60);
    this.refreshGaze();
  }

  private look(id: string, ref: string | null): void {
    this.patch(id, { gazeRef: ref, gazeTarget: ref ? (this.host.centerOf(ref) ?? undefined) : null });
  }

  private lookAll(ref: string, except: readonly string[] = []): void {
    for (const a of this.actors()) if (!except.includes(a.id)) this.look(a.id, ref);
  }

  private say(id: string, text: string): void {
    this.patch(id, { bubble: text, talkRevision: (this.get(id)?.talkRevision ?? 0) + 1 });
  }

  private startle(id: string): void {
    this.patch(id, { startleRevision: (this.get(id)?.startleRevision ?? 0) + 1 });
  }
}
```

**`nobel-stage.component.ts`**
```ts
import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, OnDestroy, viewChild } from '@angular/core';
import { CharacterRigComponent, type Vec2 } from '../character-rig';
import type { StageCharacterCommand } from '../../stage/stage.contract';
import { NobelStageDirector, type StageHost } from './stage.director';

@Component({
  selector: 'app-nobel-stage',
  standalone: true,
  imports: [CharacterRigComponent],
  templateUrl: './nobel-stage.component.html',
  styleUrl: './nobel-stage.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NobelStageComponent implements StageHost, OnDestroy {
  private readonly stageEl = viewChild.required<ElementRef<HTMLElement>>('stage');
  readonly reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  readonly director = new NobelStageDirector(this);
  private readonly resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.director.refreshGaze()) : null;

  readonly pipSlots = computed(() => {
    const { cast, required } = this.director.pips();
    return Array.from({ length: Math.max(required, 3) }, (_, i) => i < cast);
  });
  readonly flights = computed(() => { const f = this.director.flight(); return f ? [f] : []; });
  readonly flashes = computed(() => { const n = this.director.flash(); return n > 0 ? [n] : []; });
  readonly confettiPieces = computed(() => {
    const rev = this.director.confetti();
    return rev === 0 ? [] : Array.from({ length: 28 }, (_, i) => ({ id: `${rev}-${i}`, left: (i * 37) % 100, delay: (i % 7) * 70, hue: (i * 47) % 360 }));
  });

  constructor() {
    afterNextRender(() => this.resizeObserver?.observe(this.stageEl().nativeElement));
  }

  play(command: StageCharacterCommand): void { this.director.play(command); }

  centerOf(ref: string): Vec2 | null {
    const root = this.stageEl().nativeElement;
    if (ref === 'edge:right') {
      const r = root.getBoundingClientRect();
      return { x: r.right, y: r.top + r.height * 0.5 };
    }
    const [kind, id] = ref.split(':');
    const el = kind === 'actor'
      ? root.querySelector<HTMLElement>(`[data-actor-id="${id}"] .actor__body`)
      : root.querySelector<HTMLElement>(`[data-ref="${ref}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * (kind === 'actor' ? 0.2 : 0.5) }; // aktörde göz hizası
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.director.destroy();
  }
}
```

**`nobel-stage.component.html`**
```html
<div #stage class="stage" [attr.data-backdrop]="director.backdrop()" aria-hidden="true">
  <div class="stage__wall"></div>
  <div class="stage__floor"></div>

  @if (director.backdrop() === 'nomination') {
    <div class="podium" data-ref="prop:podium">
      <span class="podium__plaque">{{ director.plaque() }}</span>
      @if (director.envelopeOnPodium()) { <span class="envelope envelope--podium"></span> }
    </div>
  }
  @if (director.backdrop() === 'committee') {
    <div class="table" data-ref="prop:table">
      <div class="table__counter">
        @for (filled of pipSlots(); track $index) { <span class="pip" [class.pip--on]="filled"></span> }
      </div>
    </div>
    @for (a of director.actors(); track a.id) {
      @if (a.tableCard) { <span class="table-card" [style.left.%]="a.x" [attr.data-variant]="a.tableCard"></span> }
    }
  }

  @for (a of director.actors(); track a.id) {
    <div class="actor" [attr.data-actor-id]="a.id" [attr.data-role]="a.role"
         [style.left.%]="a.x" [style.top.%]="a.y" [style.z-index]="a.z"
         [style.--scale]="a.scale" [style.--move-ms]="a.moveMs + 'ms'">
      <div class="actor__body" [class.actor__body--hop]="a.hopping">
        <app-character-rig class="actor__rig" [config]="a.config" [activity]="a.activity" [emote]="a.emote"
                           [gazeTarget]="a.gazeTarget" [startleRevision]="a.startleRevision"
                           [talkRevision]="a.talkRevision" [label]="a.label" />
        @for (p of a.props; track p.kind) {
          <span class="prop" [attr.data-prop]="p.kind" [attr.data-variant]="p.variant ?? null">
            @if (p.kind === 'vote-card') { <b>{{ p.variant === 'KABUL' ? '✓' : p.variant === 'RED' ? '✗' : '?' }}</b> }
            @if (p.kind === 'shield') { <b>≥3</b> }
          </span>
        }
        @if (a.bubble) { <div class="bubble">{{ a.bubble }}</div> }
      </div>
      <div class="nameplate">{{ a.label }}</div>
    </div>
  }

  @for (f of flights(); track f.rev) {
    <span class="envelope envelope--fly" [style.--fx]="f.from.x" [style.--fy]="f.from.y" [style.--tx]="f.to.x" [style.--ty]="f.to.y"></span>
  }
  @for (c of confettiPieces(); track c.id) {
    <span class="confetti" [style.--left]="c.left" [style.--hue]="c.hue" [style.--delay]="c.delay + 'ms'"></span>
  }
  @for (n of flashes(); track n) { <div class="flash"></div> }
  @if (director.banner(); as b) {
    <div class="banner" [attr.data-tone]="b.tone"><strong>{{ b.text }}</strong>@if (b.sub) { <span>{{ b.sub }}</span> }</div>
  }
</div>
<p class="sr-only" aria-live="polite">{{ director.banner()?.text }}</p>
```

**`nobel-stage.component.css`** (tasarım uzayı yüzdeleri: rig 616×476 kutusu; `calc(x / 616 * 100%)` biçimi)
```css
:host {
  display: block; position: relative; width: 100%; height: 100%; min-height: 220px;
  container-type: size;
  --actor-w: clamp(84px, 17cqw, 230px);
  --gold: var(--er-gold, #d4af37);
  --role-kurulus: #d4af37; --role-aday: #5fd0c4; --role-uzman: #9ccc7a; --role-guard: #e0824a;
}
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.stage { position: absolute; inset: 0; overflow: hidden; background: #0c1f1a; border-radius: 12px; isolation: isolate; }
.stage__wall { position: absolute; inset: 0 0 28% 0; background: radial-gradient(120% 90% at 50% 0%, #1d4a3c 0%, #0f2a22 60%, #0a1814 100%); }
.stage__floor { position: absolute; inset: 72% 0 0 0; background: linear-gradient(#1c2a2f, #121c20); border-top: 2px solid #2f4a45; }

/* ── aktör ── */
.actor {
  position: absolute; width: var(--actor-w); translate: -50% -100%; scale: var(--scale, 1); transform-origin: 50% 100%;
  pointer-events: none; animation: actor-in 350ms ease-out both;
  transition: left var(--move-ms, 0ms) ease-in-out, top var(--move-ms, 0ms) ease-in-out, scale var(--move-ms, 0ms) ease-in-out;
}
.actor[data-role='KURULUS'] { --role-color: var(--role-kurulus); }
.actor[data-role='ADAY'] { --role-color: var(--role-aday); }
.actor[data-role='UZMAN'] { --role-color: var(--role-uzman); }
.actor[data-role='GUARD'] { --role-color: var(--role-guard); }
.actor__body { position: relative; aspect-ratio: 616 / 476; }
.actor__body--hop { animation: actor-hop 380ms ease-in-out infinite; }
.actor__rig { --character-width: 100%; }
.nameplate {
  position: absolute; left: 50%; top: 100%; translate: -50% 2px; max-width: 150%; padding: 1px 8px;
  font: 600 clamp(9px, 1.3cqw, 13px) / 1.4 system-ui, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: #0d1816; background: var(--role-color, #ccc); border-radius: 999px;
}
.bubble {
  position: absolute; left: 50%; top: -6%; translate: -50% -100%; z-index: 6; padding: 0.2em 0.7em; white-space: nowrap;
  font: 700 clamp(10px, 1.7cqw, 18px) / 1.3 system-ui, sans-serif; color: #17202a; background: #f3e9cb;
  border: 1px solid #2f383e; border-radius: 8px; animation: bubble-pop 260ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* ── proplar (rig'in 616×476 tasarım uzayında konumlanır) ── */
.prop { position: absolute; z-index: 5; pointer-events: none; }
.prop[data-prop='vote-card'] {
  left: calc(462 / 616 * 100%); top: calc(-28 / 476 * 100%); width: calc(66 / 616 * 100%); height: calc(84 / 476 * 100%);
  display: grid; place-items: center; color: #fff; border: 2px solid #fff; border-radius: 6%; box-shadow: 0 4px 10px #0008;
  font: 800 clamp(14px, 3.4cqw, 34px) / 1 system-ui, sans-serif; transform-origin: 50% 100%;
  animation: card-raise 380ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.prop[data-variant='KABUL'], .table-card[data-variant='KABUL'] { background: #1f9d55; }
.prop[data-variant='RED'], .table-card[data-variant='RED'] { background: #c0392b; }
.prop[data-variant='INCELEMEDE'], .table-card[data-variant='INCELEMEDE'] { background: #d9a521; }

/* tokmak: sağ koldaki (pivot 403,181) animasyonun aynısıyla döner */
.prop[data-prop='gavel'] {
  inset: 0; transform-origin: calc(403 / 616 * 100%) calc(181 / 476 * 100%);
  animation: gavel-swing 900ms cubic-bezier(0.3, 0.04, 0.5, 0.98) 3;
}
.prop[data-prop='gavel']::before { content: ''; position: absolute; left: calc(540 / 616 * 100%); top: calc(177 / 476 * 100%); width: calc(70 / 616 * 100%); height: calc(9 / 476 * 100%); background: #8a5a2b; border-radius: 4px; }
.prop[data-prop='gavel']::after { content: ''; position: absolute; left: calc(596 / 616 * 100%); top: calc(158 / 476 * 100%); width: calc(34 / 616 * 100%); height: calc(46 / 476 * 100%); background: #b9833f; border-radius: 6px; }

/* kalkan */
.prop[data-prop='shield'] {
  left: calc(236 / 616 * 100%); top: calc(186 / 476 * 100%); width: calc(144 / 616 * 100%); height: calc(176 / 476 * 100%);
  display: grid; place-items: start center; padding-top: 16%; background: var(--gold); color: var(--gold);
  clip-path: polygon(0 0, 100% 0, 100% 58%, 50% 100%, 0 58%); font: 800 clamp(12px, 2.6cqw, 26px) / 1 system-ui, sans-serif;
  animation: shield-in 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.prop[data-prop='shield']::before { content: ''; position: absolute; inset: 5%; background: linear-gradient(145deg, #5b7f9a, #2a465c); clip-path: polygon(0 0, 100% 0, 100% 58%, 50% 100%, 0 58%); }
.prop[data-prop='shield'] b { position: relative; }

/* zarf (aktör üstünde) */
.prop[data-prop='envelope'] { left: calc(262 / 616 * 100%); top: calc(214 / 476 * 100%); width: calc(92 / 616 * 100%); height: calc(62 / 476 * 100%); }
.prop[data-prop='envelope'], .envelope { background: linear-gradient(#f3d77a, #d4af37); border: 2px solid #8a6d12; border-radius: 4px; }
.prop[data-prop='envelope']::before { content: ''; position: absolute; inset: 0 0 40% 0; background: #c79a1f; clip-path: polygon(0 0, 100% 0, 50% 100%); }
.prop[data-prop='envelope']::after { content: ''; position: absolute; left: 42%; top: 34%; width: 16%; aspect-ratio: 1; border-radius: 50%; background: #b3261e; }

/* madalya ve bulut */
.prop[data-prop='medal'] { left: calc(284 / 616 * 100%); top: calc(200 / 476 * 100%); width: calc(48 / 616 * 100%); height: calc(78 / 476 * 100%); }
.prop[data-prop='medal']::before { content: ''; position: absolute; left: 20%; top: 0; width: 60%; height: 60%; background: linear-gradient(90deg, #b3261e 50%, #fff 50%); clip-path: polygon(0 0, 100% 0, 60% 100%, 40% 100%); }
.prop[data-prop='medal']::after { content: ''; position: absolute; left: 6%; bottom: 0; width: 88%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff2a8, #d4af37 60%, #8a6d12); }
.prop[data-prop='cloud'] {
  left: calc(224 / 616 * 100%); top: calc(-96 / 476 * 100%); width: calc(170 / 616 * 100%); height: calc(64 / 476 * 100%);
  background: #8b98a5; border-radius: 999px; box-shadow: 18px -10px 0 #8b98a5, -22px -4px 0 #7a8794; animation: cloud-bob 2s ease-in-out infinite;
}
.prop[data-prop='cloud']::after { content: ''; position: absolute; left: 20%; top: 100%; width: 60%; height: 140%; opacity: 0.8; background: repeating-linear-gradient(100deg, transparent 0 10px, #7fb2e6 10px 12px); animation: rain 600ms linear infinite; }

/* ── sahne dekoru ── */
.podium { position: absolute; left: 76%; top: 74%; width: 14cqw; height: 20%; translate: -50% 0; z-index: 8; display: grid; place-items: center; background: linear-gradient(#e9dfbf, #bfae7a); border: 2px solid var(--gold); border-radius: 6px 6px 0 0; }
.podium__plaque { padding: 0 0.4em; text-align: center; font: 700 clamp(8px, 1.2cqw, 13px) / 1.2 system-ui, sans-serif; color: #2a2410; }
.envelope { position: absolute; width: clamp(34px, 7cqw, 90px); aspect-ratio: 3 / 2; }
.envelope--podium { left: 50%; top: -34%; translate: -50% 0; }
.envelope--fly { left: calc(var(--fx) * 1%); top: calc(var(--fy) * 1%); z-index: 70; animation: envelope-fly 1000ms ease-in-out forwards; }

.table { position: absolute; left: 14%; right: 14%; top: 63%; height: 15%; z-index: 30; display: flex; justify-content: center; align-items: flex-start; background: linear-gradient(#6b4a2b, #4a3019); border-radius: 10px 10px 4px 4px; box-shadow: 0 8px 18px #0008; }
.table__counter { display: flex; gap: 1.2cqw; margin-top: 2%; padding: 0.4cqw 1.4cqw; background: #10191a; border: 1px solid var(--gold); border-radius: 999px; }
.pip { width: 1.6cqw; height: 1.6cqw; min-width: 8px; min-height: 8px; border-radius: 50%; background: #2b3b38; transition: background 200ms, box-shadow 200ms; }
.pip--on { background: var(--gold); box-shadow: 0 0 8px var(--gold); }
.table-card { position: absolute; top: 67%; z-index: 31; translate: -50% 0; width: 3.2cqw; height: 4.4cqw; border: 1px solid #fff; border-radius: 3px; animation: card-drop 300ms ease-out both; }

.banner { position: absolute; left: 50%; bottom: 3%; translate: -50% 0; z-index: 90; display: grid; gap: 0.15em; max-width: 92%; padding: 0.6em 1.1em; text-align: center; color: #f4efdc; background: #0d1816ee; border: 1px solid var(--gold); border-radius: 10px; font: 600 clamp(11px, 1.8cqw, 20px) / 1.3 system-ui, sans-serif; animation: banner-in 300ms ease-out both; }
.banner[data-tone='error'] { color: #ffd9d4; background: #2a0f0dee; border-color: #ff5a4d; }
.banner[data-tone='warn'] { border-color: #e0a030; }
.confetti { position: absolute; top: -4%; left: calc(var(--left) * 1%); z-index: 95; width: 1cqw; height: 1.6cqw; background: hsl(var(--hue) 85% 60%); animation: confetti-fall 2200ms ease-in var(--delay) both; }
.flash { position: absolute; inset: 0; z-index: 96; background: radial-gradient(circle, transparent 40%, #ff3b30aa); animation: flash 700ms ease-out both; }

/* ── keyframes ── */
@keyframes actor-in { from { opacity: 0; } }
@keyframes actor-hop { 50% { translate: 0 -8%; } }
@keyframes bubble-pop { from { scale: 0.5; opacity: 0; } }
@keyframes card-raise { from { translate: 0 60%; opacity: 0; } }
@keyframes card-drop { from { translate: -50% -80%; opacity: 0; } }
@keyframes shield-in { from { scale: 0.4; opacity: 0; } }
@keyframes banner-in { from { translate: -50% 40%; opacity: 0; } }
@keyframes gavel-swing { 0%, 38%, 100% { rotate: -62deg; } 56% { rotate: 22deg; } 72% { rotate: 6deg; } }
@keyframes cloud-bob { 50% { translate: 0 -6%; } }
@keyframes rain { to { translate: -8% 12%; } }
@keyframes envelope-fly {
  from { translate: 0 0; rotate: -6deg; }
  50% { translate: calc((var(--tx) - var(--fx)) * 0.5 * 1cqw) calc((var(--ty) - var(--fy)) * 0.5 * 1cqh - 8cqh); }
  to { translate: calc((var(--tx) - var(--fx)) * 1cqw) calc((var(--ty) - var(--fy)) * 1cqh); rotate: 6deg; }
}
@keyframes confetti-fall { to { translate: 0 108cqh; rotate: 540deg; } }
@keyframes flash { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .actor, .actor__body, .prop, .bubble, .banner, .table-card, .confetti, .flash, .envelope, .pip { animation: none !important; transition: none !important; }
}
```

**`nobel-character.adapter.ts`**
```ts
import { ApplicationRef, createComponent, type ComponentRef, type EnvironmentInjector } from '@angular/core';
import type { PortfolioStageAdapter, StageCharacterCommand } from '../../stage/stage.contract';
import { NobelStageComponent } from './nobel-stage.component';

/** PortfolioStageAdapter'ın Nobel uygulaması: Angular bileşenini dinamik olarak kapsayıcıya bağlar. */
export class NobelCharacterAdapter implements PortfolioStageAdapter {
  private ref: ComponentRef<NobelStageComponent> | null = null;
  private host: HTMLElement | null = null;

  constructor(private readonly injector: EnvironmentInjector) {}

  mount(container: HTMLElement): void {
    if (this.ref) return;
    const host = container.ownerDocument.createElement('div');
    host.style.cssText = 'display:block;position:relative;width:100%;height:100%;';
    container.replaceChildren(host);
    this.host = host;
    this.ref = createComponent(NobelStageComponent, { environmentInjector: this.injector, hostElement: host });
    this.injector.get(ApplicationRef).attachView(this.ref.hostView); // signal/OnPush güncellemeleri için şart
  }

  play(command: StageCharacterCommand): void {
    this.ref?.instance.play(command);
  }

  destroy(): void {
    if (!this.ref) return;
    this.injector.get(ApplicationRef).detachView(this.ref.hostView);
    this.ref.destroy();
    this.ref = null;
    this.host?.remove();
    this.host = null;
  }
}
```

**`nobel-stage.providers.ts`** ve `app.config.ts`
```ts
import { EnvironmentInjector, inject, type Provider } from '@angular/core';
import { STAGE_ADAPTER_FACTORY, type PortfolioStageAdapter } from '../../stage/stage.contract';
import { NobelCharacterAdapter } from './nobel-character.adapter';

export function provideNobelCharacterStage(): Provider {
  return {
    provide: STAGE_ADAPTER_FACTORY,
    useFactory: () => {
      const injector = inject(EnvironmentInjector);
      return (): PortfolioStageAdapter => new NobelCharacterAdapter(injector);
    },
  };
}
// app.config.ts → providers: [ …, provideNobelCharacterStage() ]
```

## 8. Testler (hepsi yeşil olmalı)
- **Rig yaması**: reducer — `emote` önceliği (`sneezing` > `startled` > `emote` > mod; `sleeping` emote'u ezer), `startle` uyuyanı etkilemez; controller — `emote(kind, holdMs)` süre sonunda `null`'a döner, `lookAt(null)` `pointer-leave` gönderir; bileşen — `gazeTarget`/`emote`/`startleRevision`/`talkRevision` girdileri controller'a ulaşır; **mevcut rig testleri/davranışı kırılmamış** (preset'ler ve `none/pushing/hauling` aktiviteleri aynı).
- `stage.accessories.spec`: tüm (rol × faz) kombinasyonları (GUARD her zaman üniformalı; KURULUS `delivering` → baret+mavi yaka; ADAY `onboarding` → baret; `rejected` → eyebags).
- `stage.layout.spec`: `seatX` simetrik, 3–7 üye için örtüşmeyen sıralı koltuklar.
- `stage.timeline.spec` (fake timer): `wait` ölçeği, `abort` bekleyenleri `SceneAbortedError` ile reddeder; `SceneQueue` sıra korur, 4'ten fazlasını eskiden atar, `dispose` sonrası çalışmaz.
- `stage.director.spec` (sahte `StageHost` + fake timer): NOMINATION → KURULUS üniformalı (`hard-hat`,`blue-collar`) yürür, teslimden sonra üniforma yok, `flight` set/sıfırlanır, `envelopeOnPodium=true`, `newAccount` ise ADAY'da `hard-hat` + "Yeni Hesap!"; COMMITTEE_VOTE → ardışık iki oy aktörleri yeniden yaratmaz, `pips` doğru dolar, oy veren `raise-right` + kart prop'u, RED'de `eyebags`, sonunda `tableCard` dolu ve `activity='rest'`; DECISION → `strike` + `gavel`, KABUL'da `medal` + `confetti` artar, RED'de `cloud` + `eyebags`; CONSTRAINT_ERROR → `guard` doğar ve sonunda silinir, `flash` artar, banner `tone='error'`; bilinmeyen `expertId` sahneyi çökertmez.
- `nobel-character.adapter.spec`: `mount` kapsayıcıda tek host oluşturur ve ikinci `mount` yeni host yaratmaz; `play` `NobelStageComponent.play`'e gider; `destroy` host'u ve view'i temizler (sızıntı yok).
- `nobel-stage.component.spec`: komut verince DOM'da `[data-actor-id]` aktörleri, `.table`/`.podium`, `.banner` görünür; `centerOf('actor:…')` sonlu bir nokta döner.

## 9. Doğrulama (çıktıları teslim notuna yaz)
1. `ng build` ve tüm testler yeşil; konsolda hata/uyarı yok; ağ sekmesinde `assets/characters/*.png` 404 yok.
2. `/live-stage?demo=1`: her demo düğmesi ER'yi (3A) **ve** sahneyi oynatır. Beklenen: NOMINATION'da kurye üniformalı karakter zarfla yürür, aday zıplayarak girer, zarf kürsüye uçar, üniforma çıkar; `newAccount` demo'sunda aday baret takar ve "Yeni Hesap!" der.
3. COMMITTEE_VOTE demo'su 3 kez arka arkaya: her seferinde yalnız oy veren öne çıkar, kartı kaldırır (yeşil ✓ / kırmızı ✗ / sarı ?), gözler oy verene döner, sayaç 1/3 → 2/3 → 3/3, masada kartlar birikir; RED oyunda oy verenin gözaltı torbaları belirir ve oturunca kaybolur.
4. DECISION demo'ları (KABUL/RED/INCELEMEDE): tokmak 3 kez vurur (kol ve tokmak aynı anda iner), KABUL'da konfeti + madalya + kollar yukarı, RED'de bulut + üzgün yüz + gözaltı torbaları, INCELEMEDE'de şaşkın kaşlar.
5. CONSTRAINT_ERROR demo'su ve **gerçek** akış (Admin'de 3 üyeli komiteden üye sil): uzman kalkmaya çalışır, baretli/mavi yakalı GUARD kalkanla (`≥3`) girip geri oturtur, kırmızı flaş ve "PostgreSQL Trigger: En az 3 uzman gerekli!" bandı; ER'de `UZMAN/uyesidir/DEĞERLENDİRME KOMİTESİ` kırmızı yanıp söner.
6. Gerçek uçtan uca: iki sekme (`/live-stage` + `uzman_1` portalı); 3 uzmanla oy ver → sahne oyları sırayla oynatır, 3. oydan sonra karar sahnesi gelir. Hızlı art arda 6 olay gönder → sahne sırayla oynar, en fazla 4 bekleyen tutulur, takılma/çökme yok.
7. Dock: `/admin` ve portallarda dock açılıp "Sahneyi göster" açılınca sahne küçük boyutta (≈360×220) okunaklı kalır; kapatınca adaptör `destroy` edilir (DevTools'ta kalan düğüm/zamanlayıcı yok). `prefers-reduced-motion` açıkken sahneler hızla biter, zıplama/konfeti yok.
8. Pencere yeniden boyutlandırılınca ve kaydırılınca gözler hedefini kaybetmez (`ResizeObserver` → `refreshGaze`).

## 10. Teslim
(a) Değişen/eklenen dosyalar (rig kopyası + yama diff'i ayrı belirtilsin), (b) komutlar ve sonuçları, (c) bilinçli sapmalar (özellikle varlık yolu, ayak/koltuk/masa yüzdelerinde yaptığın görsel ince ayarlar ve prop konumları), (d) görsel doğrulama için alınan ekran görüntülerinin listesi (NOMINATION, COMMITTEE_VOTE 2/3, DECISION KABUL, CONSTRAINT_ERROR).
````
