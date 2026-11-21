package tr.edu.nobel.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "aday_gosterme")
@Data @NoArgsConstructor
public class AdayGosterme {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "aday_gosterme_id")
    private Long adayGostermeId;
    @Column(name = "kurulus_no", nullable = false)
    private Long kurulusNo;
    @Column(name = "aday_id", nullable = false)
    private Long adayId;
    @Column(name = "odul_no", nullable = false)
    private Long odulNo;
    @Column(name = "tarih", nullable = false)
    private LocalDate tarih;
    @Column(name = "saat", nullable = false)
    private LocalTime saat;
}
