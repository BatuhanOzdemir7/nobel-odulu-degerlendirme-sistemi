# Nobel Ödülü Değerlendirme Sistemi — Faz 1

PostgreSQL şeması Flyway ile yönetilir; Hibernate yalnızca şemayı doğrular (`ddl-auto: validate`). PostgreSQL 16 veritabanı, başlangıç verileri ve komite üye alt sınırı kuralı projeye dahildir.

## Gereksinimler

- Docker Desktop / Docker Compose
- Java 21 ve Maven 3.6+
- Angular 21 LTS için Node.js 20.19+ ve npm

## Başlatma

1. Proje kökünde veritabanını başlatın: `docker compose up -d`. Backend'i açmadan önce `docker compose ps` çıktısında PostgreSQL'in `healthy` olduğunu doğrulayın.
2. Backend'i başlatın: `cd backend` ardından `mvn spring-boot:run`.
3. Yeni bir terminalde frontend'i başlatın: `cd frontend`, `npm install`, sonra `npm start`.
4. Arayüz: http://localhost:4200 — API: http://localhost:8080/api — Swagger UI: http://localhost:8080/swagger-ui.html.

İlk backend başlangıcında Flyway `V1__init_schema.sql` ve `V2__seed_data.sql` dosyalarını uygular. Veritabanı kalıcı `postgres_data` volume'unda tutulur.
Yerel geliştirme veritabanı bağlantısı: `nobel_db` / `nobel_user` / `nobel_password`.

## Entegrasyon testleri

`cd backend` ardından `mvn test`. Testler Testcontainers ile geçici PostgreSQL 16 başlatır ve üç üyeden az komite oluşturma ile üç üyeli komiteden üye çıkarma kurallarını kontrol eder. Testler için Docker çalışıyor olmalıdır.
