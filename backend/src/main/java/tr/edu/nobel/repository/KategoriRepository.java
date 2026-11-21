package tr.edu.nobel.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import tr.edu.nobel.entity.Kategori;
public interface KategoriRepository extends JpaRepository<Kategori, Long> { }
