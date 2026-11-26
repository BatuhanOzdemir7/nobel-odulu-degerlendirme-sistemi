package tr.edu.nobel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "uzman_oyu")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class UzmanOyu {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "oy_id")
    private Long oyId;
    @Column(name = "komite_id", nullable = false)
    private Long komiteId;
    @Column(name = "uzman_id", nullable = false)
    private Long uzmanId;
    @Column(name = "aday_id", nullable = false)
    private Long adayId;
    @Column(name = "olcut", nullable = false, length = 255)
    private String olcut;
    @Enumerated(EnumType.STRING) @Column(name = "karar", nullable = false, length = 30)
    private OyKarari karar;
    @Column(name = "oy_zamani", nullable = false)
    private LocalDateTime oyZamani;

    public UzmanOyu(Long komiteId, Long uzmanId, Long adayId, String olcut, OyKarari karar, LocalDateTime oyZamani) {
        this.komiteId = komiteId;
        this.uzmanId = uzmanId;
        this.adayId = adayId;
        this.olcut = olcut;
        this.karar = karar;
        this.oyZamani = oyZamani;
    }
}
