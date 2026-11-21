CREATE TABLE kategori (
    kategori_id BIGSERIAL PRIMARY KEY,
    kategori_adi VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE odul (
    odul_no BIGSERIAL PRIMARY KEY,
    aciklayici_ad VARCHAR(200) NOT NULL,
    kategori_id BIGINT NOT NULL REFERENCES kategori(kategori_id) ON DELETE RESTRICT
);

CREATE TABLE kurulus (
    kurulus_no BIGSERIAL PRIMARY KEY,
    ad VARCHAR(200) NOT NULL,
    konum VARCHAR(200) NOT NULL,
    iletisim_bilgisi VARCHAR(255) NOT NULL
);

CREATE TABLE aday (
    aday_id BIGSERIAL PRIMARY KEY,
    ad VARCHAR(100) NOT NULL,
    soyad VARCHAR(100) NOT NULL,
    cinsiyet VARCHAR(30) NOT NULL,
    dogum_tarihi DATE NOT NULL CHECK (dogum_tarihi < CURRENT_DATE),
    uyruk VARCHAR(100) NOT NULL,
    calisma_alani VARCHAR(150) NOT NULL
);

CREATE TABLE degerlendirme_komitesi (
    komite_id BIGSERIAL PRIMARY KEY,
    komite_adi VARCHAR(200) NOT NULL,
    kategori_id BIGINT NOT NULL REFERENCES kategori(kategori_id) ON DELETE RESTRICT
);

CREATE TABLE uzman (
    uzman_id BIGSERIAL PRIMARY KEY,
    ad VARCHAR(150) NOT NULL,
    adres TEXT NOT NULL,
    yas INTEGER NOT NULL CHECK (yas >= 18 AND yas <= 120),
    cinsiyet VARCHAR(30) NOT NULL,
    uzmanlik_alani VARCHAR(150) NOT NULL
);

CREATE TABLE komite_uyesi (
    komite_id BIGINT NOT NULL REFERENCES degerlendirme_komitesi(komite_id) ON DELETE CASCADE,
    uzman_id BIGINT NOT NULL REFERENCES uzman(uzman_id) ON DELETE RESTRICT,
    PRIMARY KEY (komite_id, uzman_id)
);

CREATE TABLE aday_gosterme (
    aday_gosterme_id BIGSERIAL PRIMARY KEY,
    kurulus_no BIGINT NOT NULL REFERENCES kurulus(kurulus_no) ON DELETE RESTRICT,
    aday_id BIGINT NOT NULL REFERENCES aday(aday_id) ON DELETE RESTRICT,
    odul_no BIGINT NOT NULL REFERENCES odul(odul_no) ON DELETE RESTRICT,
    tarih DATE NOT NULL,
    saat TIME NOT NULL,
    UNIQUE (kurulus_no, aday_id, odul_no, tarih, saat)
);

CREATE TABLE degerlendirme (
    degerlendirme_id BIGSERIAL PRIMARY KEY,
    aday_id BIGINT NOT NULL REFERENCES aday(aday_id) ON DELETE RESTRICT,
    komite_id BIGINT NOT NULL REFERENCES degerlendirme_komitesi(komite_id) ON DELETE RESTRICT,
    tarih DATE NOT NULL,
    sonuc VARCHAR(100) NOT NULL,
    olcut VARCHAR(255) NOT NULL,
    UNIQUE (aday_id, komite_id, tarih)
);

CREATE FUNCTION enforce_committee_minimum_members() RETURNS TRIGGER AS $$
DECLARE
    target_committee_id BIGINT;
    member_count INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'degerlendirme_komitesi' THEN
        target_committee_id := NEW.komite_id;
    ELSIF TG_OP = 'DELETE' THEN
        target_committee_id := OLD.komite_id;
    ELSE
        target_committee_id := OLD.komite_id;
    END IF;

    -- Parent deletion cascades to members; the committee no longer needs a minimum.
    IF NOT EXISTS (SELECT 1 FROM degerlendirme_komitesi WHERE komite_id = target_committee_id) THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*) INTO member_count FROM komite_uyesi WHERE komite_id = target_committee_id;
    IF member_count < 3 THEN
        RAISE EXCEPTION 'Komite en az 3 uzman üyeye sahip olmalıdır (komite_id=%; mevcut üye=%).', target_committee_id, member_count
            USING ERRCODE = '23514', CONSTRAINT = 'komite_en_az_uc_uzman';
    END IF;

    IF TG_TABLE_NAME = 'komite_uyesi' AND TG_OP = 'UPDATE' AND NEW.komite_id <> OLD.komite_id THEN
        SELECT COUNT(*) INTO member_count FROM komite_uyesi WHERE komite_id = NEW.komite_id;
        IF member_count < 3 THEN
            RAISE EXCEPTION 'Komite en az 3 uzman üyeye sahip olmalıdır (komite_id=%; mevcut üye=%).', NEW.komite_id, member_count
                USING ERRCODE = '23514', CONSTRAINT = 'komite_en_az_uc_uzman';
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER komite_insert_minimum_uyesi
AFTER INSERT ON degerlendirme_komitesi
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_committee_minimum_members();

CREATE CONSTRAINT TRIGGER komite_uyesi_delete_minimum_uyesi
AFTER DELETE OR UPDATE ON komite_uyesi
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_committee_minimum_members();
