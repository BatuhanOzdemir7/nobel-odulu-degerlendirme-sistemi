CREATE TABLE uzman_oyu (
    oy_id BIGSERIAL PRIMARY KEY,
    komite_id BIGINT NOT NULL,
    uzman_id BIGINT NOT NULL,
    aday_id BIGINT NOT NULL REFERENCES aday(aday_id) ON DELETE CASCADE,
    olcut VARCHAR(255) NOT NULL,
    karar VARCHAR(30) NOT NULL,
    oy_zamani TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_uzman_oyu_karar CHECK (karar IN ('KABUL','RED','INCELEMEDE')),
    CONSTRAINT fk_uzman_oyu_komite_uyesi FOREIGN KEY (komite_id, uzman_id)
        REFERENCES komite_uyesi (komite_id, uzman_id) ON DELETE CASCADE,
    CONSTRAINT uq_uzman_oyu UNIQUE (komite_id, uzman_id, aday_id)
);
CREATE INDEX ix_uzman_oyu_komite_aday ON uzman_oyu (komite_id, aday_id);
