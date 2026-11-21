package tr.edu.nobel.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "kategori")
@Data @NoArgsConstructor
public class Kategori {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "kategori_id")
    private Long kategoriId;
    @Column(name = "kategori_adi", nullable = false, length = 100, unique = true)
    private String kategoriAdi;
}
