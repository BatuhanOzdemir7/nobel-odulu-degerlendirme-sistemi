-- Dinamik Senaryolar için ders verisi. V2 ile oluşturulan kayıtlar korunur.
DO $$
DECLARE
    demo RECORD;
    demo_category_id BIGINT;
    demo_committee_id BIGINT;
    demo_award_id BIGINT;
    demo_organization_id BIGINT;
    demo_candidate_id BIGINT;
BEGIN
    FOR demo IN
        SELECT * FROM (VALUES
            ('Fizik', 'Nobel Fizik Ödülü',
             'CERN', 'Meyrin, İsviçre', 'cern.demo@example.org',
             'Selin', 'Arslan', 'Kadın', DATE '1978-04-17', 'Parçacık fiziği',
             ARRAY['Prof. Leyla Aksoy', 'Prof. Murat Erdem', 'Dr. Elif Arslan'],
             ARRAY['KABUL', 'RED', 'KABUL'], DATE '2025-10-06'),
            ('Tıp', 'Nobel Fizyoloji veya Tıp Ödülü',
             'Kuzey Sağlık Enstitüsü', 'Ankara, Türkiye', 'kuzey.saglik@example.org',
             'Ece', 'Aydın', 'Kadın', DATE '1982-09-08', 'Bağışıklık araştırmaları',
             ARRAY['Prof. Jonas Berg', 'Dr. Sara Lind', 'Prof. Erik Holm'],
             ARRAY['RED', 'KABUL', 'RED'], DATE '2025-10-07'),
            ('Kimya', 'Nobel Kimya Ödülü',
             'Uluslararası Kimya Akademisi', 'İzmir, Türkiye', 'kimya.akademisi@example.org',
             'Arda', 'Yalçın', 'Erkek', DATE '1976-02-23', 'Sürdürülebilir kataliz',
             ARRAY['Prof. Nil Aksoy', 'Dr. Can Erdem', 'Prof. Ada Sönmez'],
             ARRAY['KABUL', 'KABUL', 'KABUL'], DATE '2025-10-08')
        ) AS fixtures(category, award, organization, location, contact, first_name, last_name, gender,
                      birthday, specialty, experts, votes, decision_date)
    LOOP
        INSERT INTO kategori (kategori_adi) VALUES (demo.category)
        ON CONFLICT (kategori_adi) DO NOTHING;
        SELECT kategori_id INTO STRICT demo_category_id FROM kategori WHERE kategori_adi = demo.category;

        SELECT komite_id INTO demo_committee_id
        FROM degerlendirme_komitesi
        WHERE kategori_id = demo_category_id AND komite_adi = demo.category || ' Değerlendirme Komitesi'
        ORDER BY komite_id LIMIT 1;

        IF demo_committee_id IS NULL THEN
            INSERT INTO degerlendirme_komitesi (komite_adi, kategori_id)
            VALUES (demo.category || ' Değerlendirme Komitesi', demo_category_id)
            RETURNING komite_id INTO demo_committee_id;

            WITH new_experts AS (
                INSERT INTO uzman (ad, adres, yas, cinsiyet, uzmanlik_alani)
                SELECT label, demo.location, age, gender, demo.specialty
                FROM unnest(demo.experts, ARRAY[51, 44, 56], ARRAY['Kadın', 'Erkek', 'Kadın']) WITH ORDINALITY
                     AS roster(label, age, gender, position)
                ORDER BY position
                RETURNING uzman_id
            )
            INSERT INTO komite_uyesi (komite_id, uzman_id)
            SELECT demo_committee_id, uzman_id FROM new_experts;
        END IF;

        INSERT INTO odul (aciklayici_ad, kategori_id)
        VALUES (demo.award, demo_category_id) RETURNING odul_no INTO demo_award_id;
        INSERT INTO kurulus (ad, konum, iletisim_bilgisi)
        VALUES (demo.organization, demo.location, demo.contact) RETURNING kurulus_no INTO demo_organization_id;
        INSERT INTO aday (ad, soyad, cinsiyet, dogum_tarihi, uyruk, calisma_alani)
        VALUES (demo.first_name, demo.last_name, demo.gender, demo.birthday, 'Türkiye', demo.specialty)
        RETURNING aday_id INTO demo_candidate_id;
        INSERT INTO aday_gosterme (kurulus_no, aday_id, odul_no, tarih, saat)
        VALUES (demo_organization_id, demo_candidate_id, demo_award_id, demo.decision_date - 7, TIME '09:30');

        INSERT INTO uzman_oyu (komite_id, uzman_id, aday_id, olcut, karar, oy_zamani)
        SELECT demo_committee_id, uzman_id, demo_candidate_id, 'Özgünlük', demo.votes[position],
               demo.decision_date + TIME '10:00' + position * INTERVAL '1 minute'
        FROM (
            SELECT uzman_id, row_number() OVER (ORDER BY uzman_id)::integer AS position
            FROM komite_uyesi WHERE komite_id = demo_committee_id
            ORDER BY uzman_id LIMIT 3
        ) AS roster;

        INSERT INTO degerlendirme (aday_id, komite_id, tarih, sonuc, olcut)
        SELECT demo_candidate_id, demo_committee_id, demo.decision_date,
               CASE WHEN count(*) FILTER (WHERE karar = 'KABUL') > count(*) FILTER (WHERE karar = 'RED')
                    THEN 'KABUL' ELSE 'RED' END,
               'Özgünlük'
        FROM uzman_oyu
        WHERE aday_id = demo_candidate_id AND komite_id = demo_committee_id;
    END LOOP;
END;
$$;
