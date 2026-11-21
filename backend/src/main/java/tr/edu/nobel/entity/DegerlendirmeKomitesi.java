package tr.edu.nobel.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "degerlendirme_komitesi")
@Data @NoArgsConstructor
public class DegerlendirmeKomitesi {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "komite_id")
    private Long komiteId;
    @Column(name = "komite_adi", nullable = false, length = 200)
    private String komiteAdi;
    @Column(name = "kategori_id", nullable = false)
    private Long kategoriId;
}
