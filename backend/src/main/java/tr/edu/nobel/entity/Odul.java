package tr.edu.nobel.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "odul")
@Data @NoArgsConstructor
public class Odul {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "odul_no")
    private Long odulNo;
    @Column(name = "aciklayici_ad", nullable = false, length = 200)
    private String aciklayiciAd;
    @Column(name = "kategori_id", nullable = false)
    private Long kategoriId;
}
