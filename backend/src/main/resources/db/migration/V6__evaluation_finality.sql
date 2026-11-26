ALTER TABLE degerlendirme
    ADD COLUMN kesinlesmis BOOLEAN GENERATED ALWAYS AS (sonuc IN ('KABUL', 'RED', 'INCELEMEDE')) STORED,
    DROP CONSTRAINT degerlendirme_aday_id_komite_id_tarih_key,
    ADD CONSTRAINT uq_degerlendirme_aday_komite_tarih_kesinlesmis
        UNIQUE (aday_id, komite_id, tarih, kesinlesmis);
