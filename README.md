# Nobel Ödülü Değerlendirme Sistemi

**Veri Tabanı Yönetim Sistemleri dersi projesi**

Bu proje, bir Nobel Ödülü adaylığının kuruluş tarafından önerilmesinden uzmanların oylarıyla komite kararının kesinleşmesine kadar olan süreci modelleyen bir eğitim uygulamasıdır. PostgreSQL şeması, rol bazlı portallar ve canlı ER diyagramı aynı akış üzerinde ilişkisel modelleme, veri bütünlüğü ve işlem yönetimini gösterir.

Uygulama Spring Boot 3.5, Spring Security ve JWT, PostgreSQL 16, Flyway ve Angular 21 kullanır.

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

## Docker ile çalıştırma

Docker Desktop veya Docker Engine ve Docker Compose çalışırken proje kökünde `docker compose up -d` komutunu çalıştırın. Compose, PostgreSQL’i başlatır, API ve Angular imajlarını ilk çalıştırmada derler ve uygulamayı tek adreste açar. Yerel kurulum için Java, Maven veya Node.js yüklemeniz gerekmez.

```bash
git clone https://github.com/BatuhanOzdemir7/nobel-odulu-degerlendirme-sistemi.git
cd nobel-odulu-degerlendirme-sistemi
docker compose up -d
docker compose ps
```

| Sayfa | Adres |
| --- | --- |
| Giriş ve demo hesapları | [localhost:4200/login](http://localhost:4200/login) |
| Canlı ER diyagramı ve karakter sahnesi | [localhost:4200/live-stage](http://localhost:4200/live-stage) |
| Dinamik senaryolar | [localhost:4200/dinamik-senaryolar](http://localhost:4200/dinamik-senaryolar) |

Demo panelinde veritabanından gelen bir isme tıklayınca o profile ait portal açılır. Yerel demo girişi için adresi `localhost` ile açın. Angular ve `/api` istekleri aynı adresten sunulur. Flyway ilk açılışta örnek tabloları ve kayıtları hazırlar.

- Servisleri durdurmak için `docker compose stop` kullanın. PostgreSQL verileri projenin `postgres_data` veri biriminde saklanır.
- Kod değişikliğinden sonra imajları güncellemek için `docker compose up -d --build` çalıştırın. Başlangıç kayıtlarını `docker compose logs -f backend` ile takip edebilirsiniz.
- `4200` doluysa `NOBEL_APP_PORT` değişkenini boş bir porta ayarlayın. Örneğin PowerShell’de aşağıdaki komutlarla [localhost:14200](http://localhost:14200) üzerinden açabilirsiniz.

```powershell
$env:NOBEL_APP_PORT = '14200'
docker compose up -d
```

### IntelliJ ile PostgreSQL’e bağlanma

`docker compose port postgres 5432` komutu PostgreSQL’in yerelde hangi porta açıldığını gösterir. Sabit bir port gerekiyorsa `docker compose up -d` öncesinde `NOBEL_DB_PORT` değişkenini ayarlayabilirsiniz.

IntelliJ IDEA’nın **Database** panelinde host olarak `127.0.0.1`, veritabanı olarak `nobel_db`, kullanıcı olarak `nobel_user` ve geliştirme şifresi olarak `nobel_password` girin. **Test Connection** başarılı olunca `public` şemasına sağ tıklayıp **Diagrams → Show Diagram** seçin.

### Java ve Angular’ı yerelde geliştirme

Bu yöntem Java 21, Maven 3.9.x, Node.js 24 ve npm ile çalışır. Proje kökünde `docker compose up -d postgres` çalıştırın. `docker compose port postgres 5432` çıktısındaki portu kullanarak API terminalinde `DB_URL` değişkenini ayarlayın. Örneğin port `55443` ise PowerShell’de `$env:DB_URL = 'jdbc:postgresql://127.0.0.1:55443/nobel_db'` çalıştırın.

```bash
cd backend
mvn spring-boot:run "-Dspring-boot.run.arguments=--server.address=127.0.0.1 --nobel.security.local-demo-login=true"
```

Proje kökünden ayrı bir terminal açın.

```bash
cd frontend
npm ci
npm start
```

Bu kurulumda arayüz `http://localhost:4200`, API `http://localhost:8080` adresinden çalışır.

## Dersi sunarken

1. **Canlı Sahne** sayfasını bir sekmede açık bırakın.
2. Başka bir sekmede bir kuruluş hesabıyla giriş yapıp Fizik ödülü için yeni bir aday gösterin. Canlı sahnede adaylık olayını ve ER vurgusunu izleyin.
3. Fizik komitesinin üç üyesiyle sırayla giriş yapıp bir ölçüt seçerek oy verin. Her oy ER diyagramını tetikler. Üç üyeli komitede üçüncü oyla birlikte nihai karar oluşur.
4. Aynı adayla giriş yapıp adaylığı ve değerlendirme sonucunu kontrol edin. Akışı örnek verilerle göstermek için **Dinamik Senaryolar** sekmesinden bir senaryo seçebilirsiniz.

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
