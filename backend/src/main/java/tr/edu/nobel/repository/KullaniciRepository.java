package tr.edu.nobel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tr.edu.nobel.entity.Kullanici;

import java.util.Optional;

public interface KullaniciRepository extends JpaRepository<Kullanici, Long> {
    Optional<Kullanici> findByKullaniciAdi(String kullaniciAdi);
}
