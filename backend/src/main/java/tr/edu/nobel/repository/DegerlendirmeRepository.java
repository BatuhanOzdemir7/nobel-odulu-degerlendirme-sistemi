package tr.edu.nobel.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tr.edu.nobel.entity.Degerlendirme;
import tr.edu.nobel.dto.response.DegerlendirmeResponse;
import java.util.List;

public interface DegerlendirmeRepository extends JpaRepository<Degerlendirme, Long> {
    boolean existsByKomiteIdAndAdayIdAndKesinlesmisTrue(Long komiteId, Long adayId);

    List<Degerlendirme> findByKomiteIdAndKesinlesmisTrueOrderByTarihDescDegerlendirmeIdDesc(Long komiteId);

    @Query("""
            SELECT new tr.edu.nobel.dto.response.DegerlendirmeResponse(
                d.degerlendirmeId, d.komiteId, k.komiteAdi, d.adayId, d.tarih, d.sonuc, d.olcut)
            FROM Degerlendirme d JOIN DegerlendirmeKomitesi k ON d.komiteId = k.komiteId
            WHERE d.adayId = :adayId ORDER BY d.tarih DESC, d.degerlendirmeId DESC
            """)
    List<DegerlendirmeResponse> findPortalResults(Long adayId);
}
