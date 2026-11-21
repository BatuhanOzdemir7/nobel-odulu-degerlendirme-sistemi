package tr.edu.nobel.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import tr.edu.nobel.entity.Aday;
public interface AdayRepository extends JpaRepository<Aday, Long> { }
