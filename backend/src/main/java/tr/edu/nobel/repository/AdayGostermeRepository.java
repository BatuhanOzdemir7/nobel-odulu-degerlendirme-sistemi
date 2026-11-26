package tr.edu.nobel.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tr.edu.nobel.entity.AdayGosterme;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface AdayGostermeRepository extends JpaRepository<AdayGosterme, Long> {
    String DETAILS = """
            SELECT n.aday_gosterme_id AS "adayGostermeId", n.aday_id AS "adayId",
                   concat_ws(' ', a.ad, a.soyad) AS "adayAdi", n.odul_no AS "odulId",
                   o.aciklayici_ad AS "odulAdi", k.kategori_adi AS "kategoriAdi", r.ad AS "kurulusAdi",
                   n.tarih, n.saat, d.sonuc, coalesce(d.kesinlesmis, false) AS "kesinlesmis",
                   EXISTS (SELECT 1 FROM uzman_oyu v
                           JOIN degerlendirme_komitesi c ON c.komite_id = v.komite_id
                           WHERE v.aday_id = n.aday_id AND c.kategori_id = o.kategori_id) AS "inceleniyor"
            FROM aday_gosterme n JOIN aday a ON a.aday_id = n.aday_id
            JOIN odul o ON o.odul_no = n.odul_no JOIN kategori k ON k.kategori_id = o.kategori_id
            JOIN kurulus r ON r.kurulus_no = n.kurulus_no
            LEFT JOIN LATERAL (
                SELECT e.sonuc, e.kesinlesmis FROM degerlendirme e
                JOIN degerlendirme_komitesi c ON c.komite_id = e.komite_id
                WHERE e.aday_id = n.aday_id AND c.kategori_id = o.kategori_id
                ORDER BY e.kesinlesmis DESC, e.tarih DESC, e.degerlendirme_id DESC LIMIT 1
            ) d ON true
            """;
    String ORDER = " ORDER BY n.tarih DESC, n.saat DESC, n.aday_gosterme_id DESC";

    boolean existsByKurulusNoAndAdayIdAndOdulNo(Long kurulusNo, Long adayId, Long odulNo);

    @Query("""
            SELECT count(n) > 0 FROM AdayGosterme n, Odul o
            WHERE n.adayId = :adayId AND n.odulNo = o.odulNo AND o.kategoriId = :kategoriId
            """)
    boolean existsInCategory(Long adayId, Long kategoriId);

    @Query(value = DETAILS + " WHERE n.kurulus_no = :kurulusNo" + ORDER, nativeQuery = true)
    List<Details> findDetailsByKurulusNo(Long kurulusNo);

    @Query(value = DETAILS + " WHERE n.aday_id = :adayId" + ORDER, nativeQuery = true)
    List<Details> findDetailsByAdayId(Long adayId);

    @Query(value = DETAILS + " WHERE n.aday_gosterme_id = :id", nativeQuery = true)
    Optional<Details> findDetailsById(Long id);

    interface Details {
        Long getAdayGostermeId();
        Long getAdayId();
        String getAdayAdi();
        Long getOdulId();
        String getOdulAdi();
        String getKategoriAdi();
        String getKurulusAdi();
        LocalDate getTarih();
        LocalTime getSaat();
        String getSonuc();
        boolean getKesinlesmis();
        boolean getInceleniyor();
    }
}
