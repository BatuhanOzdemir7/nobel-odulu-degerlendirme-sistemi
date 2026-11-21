package tr.edu.nobel.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import tr.edu.nobel.entity.KomiteUyesi;
import tr.edu.nobel.entity.KomiteUyesiId;
public interface KomiteUyesiRepository extends JpaRepository<KomiteUyesi, KomiteUyesiId> { }
