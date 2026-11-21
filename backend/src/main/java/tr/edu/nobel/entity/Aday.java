package tr.edu.nobel.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "aday")
@Data @NoArgsConstructor
public class Aday {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "aday_id")
    private Long adayId;
    @Column(name = "ad", nullable = false, length = 100)
    private String ad;
    @Column(name = "soyad", nullable = false, length = 100)
    private String soyad;
    @Column(name = "cinsiyet", nullable = false, length = 30)
    private String cinsiyet;
    @Column(name = "dogum_tarihi", nullable = false)
    private LocalDate dogumTarihi;
    @Column(name = "uyruk", nullable = false, length = 100)
    private String uyruk;
    @Column(name = "calisma_alani", nullable = false, length = 150)
    private String calismaAlani;
}
