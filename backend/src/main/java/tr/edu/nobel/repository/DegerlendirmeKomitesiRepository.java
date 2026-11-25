package tr.edu.nobel.repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import tr.edu.nobel.entity.DegerlendirmeKomitesi;
import java.util.List;
import java.util.Optional;

public interface DegerlendirmeKomitesiRepository extends JpaRepository<DegerlendirmeKomitesi, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT k FROM DegerlendirmeKomitesi k WHERE k.komiteId = :komiteId")
    Optional<DegerlendirmeKomitesi> findByIdForUpdate(Long komiteId);

    @Query("""
            SELECT k FROM DegerlendirmeKomitesi k JOIN KomiteUyesi u ON u.id.komiteId = k.komiteId
            WHERE u.id.uzmanId = :uzmanId ORDER BY k.komiteAdi, k.komiteId
            """)
    List<DegerlendirmeKomitesi> findByUzmanId(Long uzmanId);
}
