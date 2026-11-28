# PostgreSQL Erişim Rehberi

**Nobel Ödülü Değerlendirme Sistemi · Veri Tabanı Yönetim Sistemleri dersi**

Bu rehber adaylıkları, komite kayıtlarını ve PostgreSQL şemasını doğrudan incelemek içindir. Yalnızca ders veritabanını açmak için [README'deki SQL yükleme adımlarını](../README.md#yalnızca-veritabanını-açma) izleyin. Tüm uygulamayı açtığınızda Flyway aynı ders kayıtlarını uygulamanın ayrı veritabanına yükler.

## 1. Projeyi başlatın

Docker çalışırken teslim edilen proje klasöründe şu komutları çalıştırın.

```bash
docker compose -p nobel-vtys-sunum up -d --build --wait
docker compose -p nobel-vtys-sunum ps
docker compose -p nobel-vtys-sunum port postgres 5432
```

`postgres` ve `backend` servisleri `healthy` olduğunda şema hazırdır. Son komutun çıktısı örneğin `127.0.0.1:32770` olabilir. Kendi çıktınızdaki son sayı, IntelliJ veya başka bir SQL istemcisine gireceğiniz porttur. `5432`, PostgreSQL’in konteyner içindeki portudur. Veritabanını yalnızca SQL dosyasından kurduysanız aşağıdaki komutlarda proje adı olarak `nobel-vtys-db` kullanın. [Docker Compose port komutu](https://docs.docker.com/reference/cli/docker/compose/port/)

## 2. Bağlantı bilgilerini girin

| Alan | Değer |
| --- | --- |
| Veritabanı türü | PostgreSQL 16 |
| Host | `127.0.0.1` |
| Port | `docker compose -p nobel-vtys-sunum port postgres 5432` çıktısındaki port |
| Veritabanı adı | `nobel_db` |
| Kullanıcı adı | `nobel_username` |
| Yerel geliştirme şifresi | `nobel_password` |
| Şema | `public` |

Örnek port `32770` olduğunda JDBC adresi `jdbc:postgresql://127.0.0.1:32770/nobel_db` olur. Bağlantı, Compose’u çalıştırdığınız bilgisayardaki veritabanını açar. PostgreSQL’in başlangıç ayarları [Docker Compose dosyasında](../docker-compose.yml) bulunur.

### Sabit bir port kullanmak isterseniz

Örneğin `55433` boşsa Compose’u bu portla başlatabilirsiniz. Sonraki başlatmalarda da aynı değeri kullanın.

**Windows PowerShell**

```powershell
$env:NOBEL_DB_PORT = '55433'
docker compose -p nobel-vtys-sunum up -d --build --wait
```

**Bash veya Zsh**

```bash
NOBEL_DB_PORT=55433 docker compose -p nobel-vtys-sunum up -d --build --wait
```

Bu durumda istemcideki port `55433`, JDBC adresi `jdbc:postgresql://127.0.0.1:55433/nobel_db` olur.

## 3. IntelliJ IDEA’da tabloları ve ER diyagramını açın

1. **View → Tool Windows → Database** panelini açın.
2. **+ → Data Source → PostgreSQL** seçin. **General** sekmesinde yukarıdaki host, port, veritabanı adı, kullanıcı adı ve şifreyi girin.
3. **Download missing driver files** görünürse JDBC sürücüsünü indirin. **Test Connection** başarılı olunca **OK** ile kaydedin. [IntelliJ PostgreSQL bağlantısı](https://www.jetbrains.com/help/idea/postgresql.html)
4. Database panelinde bağlantıyı genişletin, ardından **nobel_db → public → tables** yolunu izleyin. Satırları görmek için bir tabloya çift tıklayın. `public` görünmüyorsa bağlantının **Properties → Schemas** sekmesinden şemayı seçip bağlantıyı yenileyin.
5. `public` şemasına sağ tıklayıp **Diagrams → Show Diagram** seçin. Diyagram PostgreSQL’de tanımlanan tabloları ve yabancı anahtar ilişkilerini gösterir. [IntelliJ veritabanı diyagramları](https://www.jetbrains.com/help/idea/creating-diagrams.html)

Database veya Diagrams menüsü görünmüyorsa **Settings → Plugins** altında **Database Tools and SQL** ve **Diagrams** eklentilerini kontrol edin. Kullanılabilir özellikler IntelliJ aboneliğine bağlıdır. Projenin [kavramsal ER diyagramı](NOBELfinal.drawio.png) depoda da görüntülenebilir. [JetBrains eklenti bilgileri](https://www.jetbrains.com/help/idea/creating-diagrams.html)

## 4. Docker içinden `psql` ile bağlanın

Grafik istemci kurmadan proje klasöründen PostgreSQL konsolunu açabilirsiniz.

```bash
docker compose -p nobel-vtys-sunum exec postgres psql -U nobel_username -d nobel_db
```

Konsolda aşağıdaki `psql` komutlarını kullanın.

```text
\conninfo
\dt public.*
\d public.uzman_oyu
\q
```

`\dt` şemadaki tabloları listeler. `\d` sütunları, indeksleri ve kısıtları gösterir. `\q` konsoldan çıkar.

## 5. Örnek SQL sorguları

Aşağıdaki sorguları IntelliJ Query Console’da veya `psql` oturumunda çalıştırabilirsiniz.

### Kuruluşların gösterdiği adaylar

`aday_gosterme` tablosu, aday, kuruluş ve ödül kayıtlarını birleştirir.

```sql
SELECT concat_ws(' ', a.ad, a.soyad) AS aday,
       k.ad AS kurulus,
       o.aciklayici_ad AS odul,
       ag.tarih,
       ag.saat
FROM public.aday_gosterme AS ag
JOIN public.aday AS a ON a.aday_id = ag.aday_id
JOIN public.kurulus AS k ON k.kurulus_no = ag.kurulus_no
JOIN public.odul AS o ON o.odul_no = ag.odul_no
ORDER BY ag.tarih DESC, ag.saat DESC, ag.aday_gosterme_id DESC;
```

### Komite üyeleri ve asgari üye kuralı

Üye sayıları `komite_uyesi` tablosundan hesaplanır. İkinci sorgu, üç uzman kuralını işlem sonunda denetleyen PostgreSQL tetikleyicilerini gösterir.

```sql
SELECT k.komite_adi, count(u.uzman_id) AS uye_sayisi
FROM public.degerlendirme_komitesi AS k
LEFT JOIN public.komite_uyesi AS u ON u.komite_id = k.komite_id
GROUP BY k.komite_id, k.komite_adi
ORDER BY k.komite_adi;

SELECT tgname AS tetikleyici,
       tgdeferrable AS ertelenebilir,
       tginitdeferred AS islem_sonunda_denetlenir
FROM pg_catalog.pg_trigger
WHERE tgrelid IN ('public.degerlendirme_komitesi'::regclass, 'public.komite_uyesi'::regclass)
  AND tgname IN ('komite_insert_minimum_uyesi', 'komite_uyesi_delete_minimum_uyesi')
ORDER BY tgname;
```

### Ön değerlendirmeler ve komite kararları

`kesinlesmis` alanı komitenin nihai kararını ön değerlendirme notundan ayırır. Örnek verilerde üç ön değerlendirme ile Fizik, Tıp ve Kimya senaryolarına ait üç nihai karar bulunur.

```sql
SELECT concat_ws(' ', a.ad, a.soyad) AS aday,
       k.komite_adi,
       d.tarih,
       d.sonuc,
       d.kesinlesmis
FROM public.degerlendirme AS d
JOIN public.aday AS a ON a.aday_id = d.aday_id
JOIN public.degerlendirme_komitesi AS k ON k.komite_id = d.komite_id
ORDER BY d.tarih DESC, d.degerlendirme_id DESC;
```

### Adaylıktan komite kararına

Bu sorgu kuruluşu, adayı, ödülü, ödülün kategorisini ve ilgili komiteyi birleştirir. Son iki sütun, kesinleşmiş karar ve komite üyelerinden gelen oy sayısını gösterir.

```sql
SELECT o.ad AS kurulus,
       concat_ws(' ', a.ad, a.soyad) AS aday,
       od.aciklayici_ad AS odul,
       k.kategori_adi AS kategori,
       c.komite_adi AS komite,
       d.sonuc,
       count(v.oy_id) AS oy_sayisi
FROM public.aday_gosterme AS n
JOIN public.kurulus AS o USING (kurulus_no)
JOIN public.aday AS a USING (aday_id)
JOIN public.odul AS od USING (odul_no)
JOIN public.kategori AS k ON k.kategori_id = od.kategori_id
JOIN public.degerlendirme_komitesi AS c ON c.kategori_id = k.kategori_id
JOIN public.degerlendirme AS d ON d.komite_id = c.komite_id AND d.aday_id = a.aday_id
LEFT JOIN public.uzman_oyu AS v ON v.komite_id = c.komite_id AND v.aday_id = a.aday_id
WHERE d.kesinlesmis
GROUP BY o.ad, a.ad, a.soyad, od.aciklayici_ad, k.kategori_adi, c.komite_adi, d.sonuc
ORDER BY k.kategori_adi, aday;
```

## Bağlantı sorunları

| Belirti | Kontrol |
| --- | --- |
| Bağlantı reddediliyor | Docker’ın açık olduğunu ve `postgres` servisinin `healthy` göründüğünü kontrol edin. Güncel portu `docker compose -p nobel-vtys-sunum port postgres 5432` ile alın. |
| Kullanıcı adı veya şifre reddediliyor | Bağlantının Docker’ın yayımladığı porta gittiğini ve veritabanı adının `nobel_db` olduğunu kontrol edin. Sunum projesinin kullanıcı adı `nobel_username`. |
| `public` şemasında tablo görünmüyor | Tam uygulamada `backend` servisinin durumunu `docker compose -p nobel-vtys-sunum ps` ile kontrol edin. Yalnızca PostgreSQL'i açtıysanız SQL yükleme komutunun tamamlandığını doğrulayın. IntelliJ’de `public` şemasını seçip bağlantıyı yenileyin. |
| Compose hizmeti bulamıyor | Komutu proje kökünde çalıştırın. Projeyi `docker compose -p` ile başlattıysanız sonraki komutlarda aynı proje adını kullanın. |

İnceleme bitince proje klasöründe `docker compose -p nobel-vtys-sunum stop` ile servisleri durdurabilirsiniz. Kayıtlar `postgres_data` veri biriminde saklanır.
