package tr.edu.nobel.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "kurulus")
@Data @NoArgsConstructor
public class Kurulus {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "kurulus_no")
    private Long kurulusNo;
    @Column(name = "ad", nullable = false, length = 200)
    private String ad;
    @Column(name = "konum", nullable = false, length = 200)
    private String konum;
    @Column(name = "iletisim_bilgisi", nullable = false, length = 255)
    private String iletisimBilgisi;
}
