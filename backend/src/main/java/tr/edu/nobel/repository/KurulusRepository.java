package tr.edu.nobel.repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import tr.edu.nobel.entity.Kurulus;
import java.util.Optional;

public interface KurulusRepository extends JpaRepository<Kurulus, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT k FROM Kurulus k WHERE k.kurulusNo = :kurulusNo")
    Optional<Kurulus> findByIdForUpdate(Long kurulusNo);
}
