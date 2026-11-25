INSERT INTO kullanici (kullanici_adi, sifre_hash, rol)
VALUES ('admin', '$2a$10$x.WxsACdJYiniYJ0jkPBsO7YrpYUGQl7z12.Ho/s1dNQEwmF0xBJ.', 'ADMIN');

-- Mevcut V2 verisinde CERN yoksa ilk kuruluş kullanılır.
INSERT INTO kullanici (kullanici_adi, sifre_hash, rol, kurulus_no)
SELECT 'kurulus_cern', '$2a$10$F1qyZGhqNCze7vVgGatLOefD7/TG8g4UQMcTzl4nqE4h4zSI4hRhy', 'KURULUS', kurulus_no
FROM kurulus
ORDER BY (ad = 'CERN') DESC, kurulus_no
LIMIT 1;

WITH ilk_komite AS (
    SELECT MIN(komite_id) AS komite_id FROM degerlendirme_komitesi
), uyeler AS (
    SELECT uzman_id, ROW_NUMBER() OVER (ORDER BY uzman_id) AS sira
    FROM komite_uyesi JOIN ilk_komite USING (komite_id)
)
INSERT INTO kullanici (kullanici_adi, sifre_hash, rol, uzman_id)
SELECT 'uzman_' || sira, '$2a$10$F1qyZGhqNCze7vVgGatLOefD7/TG8g4UQMcTzl4nqE4h4zSI4hRhy', 'UZMAN', uzman_id
FROM uyeler
WHERE sira <= 3;

INSERT INTO kullanici (kullanici_adi, sifre_hash, rol, aday_id)
SELECT 'aday_1', '$2a$10$F1qyZGhqNCze7vVgGatLOefD7/TG8g4UQMcTzl4nqE4h4zSI4hRhy', 'ADAY', MIN(aday_id)
FROM aday
HAVING COUNT(*) > 0;
