package tr.edu.nobel.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "degerlendirme")
@Data @NoArgsConstructor
public class Degerlendirme {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "degerlendirme_id")
    private Long degerlendirmeId;
    @Column(name = "aday_id", nullable = false)
    private Long adayId;
    @Column(name = "komite_id", nullable = false)
    private Long komiteId;
    @Column(name = "tarih", nullable = false)
    private LocalDate tarih;
    @Column(name = "sonuc", nullable = false, length = 100)
    private String sonuc;
    @JsonIgnore
    @Column(name = "kesinlesmis", insertable = false, updatable = false)
    private boolean kesinlesmis;
    @Column(name = "olcut", nullable = false, length = 255)
    private String olcut;
}
