CREATE TABLE kullanici (
    kullanici_id     BIGSERIAL PRIMARY KEY,
    kullanici_adi    VARCHAR(100) NOT NULL UNIQUE,
    sifre_hash       VARCHAR(255) NOT NULL,
    rol              VARCHAR(30)  NOT NULL,
    aktif            BOOLEAN      NOT NULL DEFAULT TRUE,
    kurulus_no       BIGINT UNIQUE REFERENCES kurulus(kurulus_no) ON DELETE CASCADE,
    aday_id          BIGINT UNIQUE REFERENCES aday(aday_id) ON DELETE CASCADE,
    uzman_id         BIGINT UNIQUE REFERENCES uzman(uzman_id) ON DELETE CASCADE,
    olusturma_zamani TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_kullanici_rol CHECK (rol IN ('ADMIN', 'KURULUS', 'ADAY', 'UZMAN')),
    CONSTRAINT ck_kullanici_sahiplik CHECK (
        (rol = 'ADMIN'   AND kurulus_no IS NULL     AND aday_id IS NULL     AND uzman_id IS NULL) OR
        (rol = 'KURULUS' AND kurulus_no IS NOT NULL AND aday_id IS NULL     AND uzman_id IS NULL) OR
        (rol = 'ADAY'    AND aday_id IS NOT NULL    AND kurulus_no IS NULL  AND uzman_id IS NULL) OR
        (rol = 'UZMAN'   AND uzman_id IS NOT NULL   AND kurulus_no IS NULL  AND aday_id IS NULL)
    )
);

CREATE TABLE sistem_ayari (
    anahtar           VARCHAR(100) PRIMARY KEY,
    deger             VARCHAR(255) NOT NULL,
    guncelleme_zamani TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_sistem_ayari_gizlilik CHECK (anahtar <> 'GIZLILIK_MODU' OR deger IN ('SEFFAF', 'GIZLI'))
);

INSERT INTO sistem_ayari (anahtar, deger) VALUES ('GIZLILIK_MODU', 'SEFFAF');
