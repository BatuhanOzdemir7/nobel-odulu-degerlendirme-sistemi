package tr.edu.nobel.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tr.edu.nobel.entity.Aday;

import java.util.List;

public interface AdayRepository extends JpaRepository<Aday, Long> {
    @Query(value = """
            SELECT a.aday_id AS "adayId", concat_ws(' ', a.ad, a.soyad) AS "gorunenAd",
                   a.calisma_alani AS "calismaAlani", (u.kullanici_id IS NOT NULL) AS "hesapVar"
            FROM aday a LEFT JOIN kullanici u ON u.aday_id = a.aday_id
            WHERE strpos(lower(translate(concat_ws(' ', a.ad, a.soyad, a.calisma_alani),
                                         'ÇĞİÖŞÜçğıöşüI', 'cgiosucgiosui')), :q) > 0
            ORDER BY a.ad, a.soyad, a.aday_id LIMIT 20
            """, nativeQuery = true)
    List<SearchResult> searchPortal(String q);

    @Query("""
            SELECT a FROM Aday a WHERE EXISTS (
                SELECT 1 FROM AdayGosterme n, Odul o
                WHERE n.adayId = a.adayId AND n.odulNo = o.odulNo AND o.kategoriId = :kategoriId
            ) ORDER BY a.ad, a.soyad, a.adayId
            """)
    List<Aday> findNominatedInCategory(Long kategoriId);

    @Query("""
            SELECT count(a) FROM Aday a WHERE EXISTS (
                SELECT 1 FROM AdayGosterme n, Odul o
                WHERE n.adayId = a.adayId AND n.odulNo = o.odulNo AND o.kategoriId = :kategoriId
            ) AND NOT EXISTS (
                SELECT 1 FROM Degerlendirme d WHERE d.adayId = a.adayId AND d.komiteId = :komiteId AND d.kesinlesmis = true
            )
            """)
    long countPendingForCommittee(Long kategoriId, Long komiteId);

    interface SearchResult {
        Long getAdayId();
        String getGorunenAd();
        String getCalismaAlani();
        boolean getHesapVar();
    }
}
