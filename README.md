# Nobel Ödülü Değerlendirme Sistemi

**Veri Tabanı Yönetim Sistemleri dersi projesi**

Bu proje, bir Nobel Ödülü adaylığının kuruluş tarafından önerilmesinden uzmanların oylarıyla komite kararının kesinleşmesine kadar olan süreci modelleyen bir eğitim uygulamasıdır. PostgreSQL şeması, rol bazlı portallar ve canlı ER diyagramı aynı akış üzerinde ilişkisel modelleme, veri bütünlüğü ve işlem yönetimini gösterir.

![Komite oylamasının ardından adayın kabul edilmesini gösteren karakter sahnesi](docs/faz-3b-gorseller/03-karar-kabul.png)

## Neler yapılabilir?

| Rol | İşlemler |
| --- | --- |
| **Yönetici** | Kategorileri, ödülleri, adayları, kuruluşları, uzmanları ve komiteleri yönetir. Aday portalının gizlilik ayarını belirler. |
| **Kuruluş** | Kayıtlı bir kişiyi seçerek veya yeni bir aday oluşturarak ödül için aday gösterir. Kendi adaylıklarını takip eder. |
| **Uzman** | Üyesi olduğu komitede, komitenin kategorisindeki adaylar için ölçüt seçip oy verir. Komitedeki oyları ve kararı görür. |
| **Aday** | Kendi adaylıklarını, değerlendirme aşamalarını ve gizlilik ayarının izin verdiği sonuçları görür. |

- **Canlı Sahne** uygulama işlemlerini Server-Sent Events (SSE) üzerinden izler. İlgili ER düğümleri vurgulanır, işlem özeti görünür ve varsa karakter animasyonu oynar.
- **Dinamik Senaryolar** fizik, tıp ve kimya için örnek adaylıklar oynatır. Örneğin CERN bir adayı gösterir, üç uzman sırayla oy verir ve komite sonucu açıklanır. Her çalıştırmada oylar yeniden üretilir. Örnek akışlar veritabanına kayıt yazmadan tarayıcıda çalışır.

## ER modeli ve veri bütünlüğü

![Ödül, kategori, kuruluş, aday, komite ve uzman varlıklarının ilişkilerini gösteren ER diyagramı](docs/NOBELfinal.drawio.png)

- `aday_gosterme`, kuruluşu, adayı ve ödülü aynı adaylık kaydında ilişkilendirir. `komite_uyesi`, komitelerle uzmanlar arasındaki çoktan çoğa ilişkiyi kurar.
- PostgreSQL’in ertelenebilir kısıt tetikleyicileri, işlem tamamlanırken komitede **en az üç uzman** bulunmasını denetler.
- `uzman_oyu` tablosundaki yabancı anahtar, uzmanın ilgili komitenin üyesi olmasını sağlar. Benzersizlik kısıtı aynı uzmanın aynı komitede aynı adaya ikinci kez oy vermesini engeller.
- Komitenin tüm üyeleri oy verdiğinde karar otomatik kesinleşir. Varsayılan olarak en az üç oy varsa karar elle de kesinleştirilebilir. `degerlendirme` tablosundaki `kesinlesmis` alanı, ön değerlendirmeleri nihai kararlardan ayırır.
- Flyway `V1`–`V6` geçişleriyle şemayı ve başlangıç verilerini yönetir. Hibernate, Java varlıklarının şemayla uyumunu başlangıçta doğrular.

Güncel tablo ve kısıt tanımları [Flyway geçişlerinde](backend/src/main/resources/db/migration) yer alır. [IntelliJ veritabanı görünümü](docs/IntellijDatabase.png) de depoya eklenmiştir.

## Yerelde çalıştırma

### Gereksinimler

- Git ve çalışan bir Docker motoru ile Docker Compose
- Java 21 ve Maven 3.9.x
- Node.js 24 ve npm

Uygulama Spring Boot 3.5, Spring Security ve JWT, Spring Data JPA, PostgreSQL 16, Flyway ve Angular 21 kullanır.

### 1. Depoyu klonlayın ve PostgreSQL’i başlatın

```bash
git clone https://github.com/BatuhanOzdemir7/nobel-odulu-degerlendirme-sistemi.git
cd nobel-odulu-degerlendirme-sistemi
docker compose up -d postgres
docker compose ps
```

`postgres` hizmeti `healthy` olunca devam edin. Varsayılan veritabanı `nobel_db`, kullanıcı `nobel_user`, geliştirme şifresi `nobel_password` ve PostgreSQL portu `5432`’dir. Kayıtlar Docker’ın `postgres_data` veri biriminde saklanır. Servisi durdurmak için proje kökünde `docker compose stop` kullanabilirsiniz.

### 2. API’yi başlatın

Proje kökünden ayrı bir terminalde aşağıdaki komutları çalıştırın.

```bash
cd backend
mvn spring-boot:run "-Dspring-boot.run.arguments=--server.address=127.0.0.1 --nobel.security.local-demo-login=true"
```

API `http://localhost:8080` üzerinden çalışır. İlk başlatmada Flyway tabloları oluşturur ve örnek verileri yükler. Bu komut tek tıkla demo girişini yerel kullanım için açar. Demo girişi varsayılan olarak kapalıdır. Şifreli giriş için API’yi `mvn spring-boot:run` ile de başlatabilirsiniz.

### 3. Angular arayüzünü başlatın

Proje kökünden yeni bir terminal açın.

```bash
cd frontend
npm ci
npm start
```

| Sayfa | Adres |
| --- | --- |
| Giriş ve demo hesapları | [localhost:4200/login](http://localhost:4200/login) |
| Canlı ER diyagramı ve karakter sahnesi | [localhost:4200/live-stage](http://localhost:4200/live-stage) |
| Dinamik senaryolar | [localhost:4200/dinamik-senaryolar](http://localhost:4200/dinamik-senaryolar) |

Demo panelinde veritabanından gelen bir isme tıklayınca o profile ait portal açılır. Yerel demo için arayüzü `http://localhost:4200` üzerinden açın.

### PostgreSQL farklı bir portta çalışıyorsa

`5432` kullanımdaysa [docker-compose.yml](docker-compose.yml) içindeki `postgres.ports` eşlemesini `"127.0.0.1:55443:5432"` olarak düzenleyip PostgreSQL’i başlatın. Makinenizde proje zaten `nobel-local-postgres` konteyneriyle `55443` üzerinde kurulmuşsa mevcut kayıtlarla devam etmek için `docker start nobel-local-postgres` çalıştırın.

API’yi başlatacağınız terminalde bağlantı adresini ayarlayın. Diğer bağlantı bilgileri için gerektiğinde `DB_USERNAME` ve `DB_PASSWORD` ortam değişkenleri kullanılabilir.

```powershell
# Windows PowerShell
$env:DB_URL = 'jdbc:postgresql://127.0.0.1:55443/nobel_db'
```

```bash
# Bash veya Zsh
export DB_URL='jdbc:postgresql://127.0.0.1:55443/nobel_db'
```

Ardından aynı terminalde 2. adımdaki API komutunu çalıştırın.

## Dersi sunarken

1. **Canlı Sahne** sayfasını bir sekmede açık bırakın.
2. Başka bir sekmede bir kuruluş hesabıyla giriş yapıp Fizik ödülü için yeni bir aday gösterin. Canlı sahnede adaylık olayını ve ER vurgusunu izleyin.
3. Fizik komitesinin üç üyesiyle sırayla giriş yapıp bir ölçüt seçerek oy verin. Her oy ER diyagramını tetikler. Üç üyeli komitede üçüncü oyla birlikte nihai karar oluşur.
4. Aynı adayla giriş yapıp adaylığı ve değerlendirme sonucunu kontrol edin. Akışı örnek verilerle göstermek için **Dinamik Senaryolar** sekmesinden bir senaryo seçebilirsiniz.

PostgreSQL tablolarını doğrudan incelemek için IntelliJ IDEA’nın **Database** panelinde bir PostgreSQL bağlantısı oluşturun. Host `127.0.0.1`, veritabanı `nobel_db` ve port Docker’da yayımlanan port olmalıdır. **Test Connection** başarılı olunca `public` şemasına sağ tıklayıp **Diagrams → Show Diagram** seçin.

## Testler

| Klasör | Komut | Kapsam |
| --- | --- | --- |
| `backend/` | `mvn verify` | Birim ve entegrasyon testleri. Testcontainers geçici bir PostgreSQL örneği başlatır. Docker açık olmalıdır. |
| `frontend/` | `npm test` | Angular ve Vitest testleri. |
| `frontend/` | `npm run build` | Üretim derlemesi `frontend/dist/` altında oluşturulur. |

## Depo yapısı

| Konum | İçerik |
| --- | --- |
| [`backend/`](backend) | REST API, güvenlik, iş kuralları, Flyway geçişleri ve PostgreSQL testleri |
| [`frontend/`](frontend) | Rol portalları, SVG ER diyagramı, canlı sahne ve dinamik senaryolar |
| [`docs/`](docs) | [Tasarım yol haritası](docs/YolHaritasi.md), [canlı olay akışı](docs/Faz-3A-Teslim-Notu.md) ve [karakter sahnesi](docs/Faz-3B-Teslim-Notu.md) teslim notları |
