INSERT INTO kategori (kategori_adi) VALUES
('Fizik'), ('Kimya'), ('Tıp'), ('Edebiyat'), ('Barış'), ('Ekonomi Bilimleri');

INSERT INTO odul (aciklayici_ad, kategori_id) VALUES
('Fizik alanında olağanüstü katkı', (SELECT kategori_id FROM kategori WHERE kategori_adi = 'Fizik')),
('Kimya alanında olağanüstü katkı', (SELECT kategori_id FROM kategori WHERE kategori_adi = 'Kimya')),
('Fizyoloji veya Tıp alanında olağanüstü katkı', (SELECT kategori_id FROM kategori WHERE kategori_adi = 'Tıp')),
('Edebiyata katkı', (SELECT kategori_id FROM kategori WHERE kategori_adi = 'Edebiyat')),
('Barış çalışmaları', (SELECT kategori_id FROM kategori WHERE kategori_adi = 'Barış')),
('Ekonomi bilimlerine katkı', (SELECT kategori_id FROM kategori WHERE kategori_adi = 'Ekonomi Bilimleri'));

INSERT INTO kurulus (ad, konum, iletisim_bilgisi) VALUES
('Küresel Bilim Akademisi', 'Stockholm, İsveç', 'bilim@example.org'),
('Uluslararası Sağlık Enstitüsü', 'Cenevre, İsviçre', 'saglik@example.org'),
('Dünya Barış Araştırmaları Merkezi', 'Oslo, Norveç', 'baris@example.org');

INSERT INTO aday (ad, soyad, cinsiyet, dogum_tarihi, uyruk, calisma_alani) VALUES
('Ada', 'Yılmaz', 'Kadın', '1970-04-12', 'Türkiye', 'Kuantum fiziği'),
('Deniz', 'Kaya', 'Erkek', '1965-09-23', 'Türkiye', 'Kimya'),
('Mina', 'Demir', 'Kadın', '1980-01-05', 'İsveç', 'Tıp araştırmaları'),
('Aras', 'Şahin', 'Erkek', '1975-06-18', 'Norveç', 'Barış çalışmaları');

INSERT INTO uzman (ad, adres, yas, cinsiyet, uzmanlik_alani) VALUES
('Prof. Leyla Aksoy', 'Stockholm, İsveç', 58, 'Kadın', 'Kuantum fiziği'),
('Prof. Murat Erdem', 'Ankara, Türkiye', 62, 'Erkek', 'Teorik fizik'),
('Dr. Elif Arslan', 'İzmir, Türkiye', 45, 'Kadın', 'Parçacık fiziği'),
('Prof. Jonas Berg', 'Uppsala, İsveç', 54, 'Erkek', 'Tıp araştırmaları'),
('Dr. Sara Lind', 'Oslo, Norveç', 42, 'Kadın', 'Halk sağlığı'),
('Prof. Erik Holm', 'Bergen, Norveç', 60, 'Erkek', 'Biyomedikal bilimler'),
('Dr. Aylin Güneş', 'İstanbul, Türkiye', 49, 'Kadın', 'Barış çalışmaları'),
('Prof. Nils Hansen', 'Oslo, Norveç', 57, 'Erkek', 'Uluslararası ilişkiler'),
('Dr. Zeynep Koç', 'Ankara, Türkiye', 39, 'Kadın', 'İnsan hakları');

INSERT INTO degerlendirme_komitesi (komite_adi, kategori_id) VALUES
('Fizik Değerlendirme Komitesi', (SELECT kategori_id FROM kategori WHERE kategori_adi = 'Fizik')),
('Tıp Değerlendirme Komitesi', (SELECT kategori_id FROM kategori WHERE kategori_adi = 'Tıp')),
('Barış Değerlendirme Komitesi', (SELECT kategori_id FROM kategori WHERE kategori_adi = 'Barış'));

INSERT INTO komite_uyesi (komite_id, uzman_id)
SELECT c.komite_id, u.uzman_id
FROM degerlendirme_komitesi c
CROSS JOIN uzman u
WHERE (c.komite_adi = 'Fizik Değerlendirme Komitesi' AND u.uzman_id BETWEEN 1 AND 3)
   OR (c.komite_adi = 'Tıp Değerlendirme Komitesi' AND u.uzman_id BETWEEN 4 AND 6)
   OR (c.komite_adi = 'Barış Değerlendirme Komitesi' AND u.uzman_id BETWEEN 7 AND 9);

INSERT INTO aday_gosterme (kurulus_no, aday_id, odul_no, tarih, saat) VALUES
(1, 1, 1, '2025-01-10', '09:30'),
(2, 3, 3, '2025-01-12', '11:00'),
(3, 4, 5, '2025-01-15', '14:15');

INSERT INTO degerlendirme (aday_id, komite_id, tarih, sonuc, olcut) VALUES
((SELECT aday_id FROM aday WHERE ad = 'Ada' AND soyad = 'Yılmaz'),
 (SELECT komite_id FROM degerlendirme_komitesi WHERE komite_adi = 'Fizik Değerlendirme Komitesi'),
 '2025-03-01', 'Ön değerlendirmede başarılı', 'Bilimsel özgünlük ve etki'),
((SELECT aday_id FROM aday WHERE ad = 'Mina' AND soyad = 'Demir'),
 (SELECT komite_id FROM degerlendirme_komitesi WHERE komite_adi = 'Tıp Değerlendirme Komitesi'),
 '2025-03-02', 'İnceleme sürüyor', 'Klinik katkı ve toplumsal fayda'),
((SELECT aday_id FROM aday WHERE ad = 'Aras' AND soyad = 'Şahin'),
 (SELECT komite_id FROM degerlendirme_komitesi WHERE komite_adi = 'Barış Değerlendirme Komitesi'),
 '2025-03-03', 'Ek bilgi istendi', 'Uluslararası barışa katkı');
