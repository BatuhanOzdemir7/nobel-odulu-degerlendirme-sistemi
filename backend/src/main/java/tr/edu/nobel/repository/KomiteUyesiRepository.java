package tr.edu.nobel.repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import tr.edu.nobel.entity.KomiteUyesi;
import tr.edu.nobel.entity.KomiteUyesiId;
import tr.edu.nobel.event.MemberRef;
import java.util.List;

public interface KomiteUyesiRepository extends JpaRepository<KomiteUyesi, KomiteUyesiId> {
    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("SELECT m FROM KomiteUyesi m WHERE m.id.komiteId = :komiteId ORDER BY m.id.uzmanId")
    List<KomiteUyesi> lockMembers(Long komiteId);

    @Query("""
            SELECT new tr.edu.nobel.event.MemberRef(u.uzmanId, u.ad)
            FROM KomiteUyesi m JOIN Uzman u ON m.id.uzmanId = u.uzmanId
            WHERE m.id.komiteId = :komiteId ORDER BY u.uzmanId
            """)
    List<MemberRef> findMembers(Long komiteId);
}
