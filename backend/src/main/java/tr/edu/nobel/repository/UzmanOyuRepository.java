package tr.edu.nobel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tr.edu.nobel.entity.UzmanOyu;

import java.util.List;

public interface UzmanOyuRepository extends JpaRepository<UzmanOyu, Long> {
    List<UzmanOyu> findByKomiteIdAndAdayIdOrderByOyId(Long komiteId, Long adayId);
    List<UzmanOyu> findByKomiteIdOrderByOyId(Long komiteId);
    long countByKomiteIdAndAdayId(Long komiteId, Long adayId);
    boolean existsByKomiteIdAndUzmanIdAndAdayId(Long komiteId, Long uzmanId, Long adayId);
}
