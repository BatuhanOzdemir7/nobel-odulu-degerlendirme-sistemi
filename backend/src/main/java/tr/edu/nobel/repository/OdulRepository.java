package tr.edu.nobel.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tr.edu.nobel.entity.Odul;
import tr.edu.nobel.dto.response.OdulSecenekResponse;
import java.util.List;

public interface OdulRepository extends JpaRepository<Odul, Long> {
    @Query("""
            SELECT new tr.edu.nobel.dto.response.OdulSecenekResponse(o.odulNo, o.aciklayiciAd, k.kategoriId, k.kategoriAdi)
            FROM Odul o JOIN Kategori k ON o.kategoriId = k.kategoriId ORDER BY k.kategoriAdi, o.aciklayiciAd
            """)
    List<OdulSecenekResponse> findPortalOptions();
}
