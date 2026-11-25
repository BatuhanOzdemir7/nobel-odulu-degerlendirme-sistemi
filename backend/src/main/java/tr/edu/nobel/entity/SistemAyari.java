package tr.edu.nobel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "sistem_ayari")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class SistemAyari {
    @Id @Column(name = "anahtar", length = 100)
    private String anahtar;
    @Column(name = "deger", nullable = false, length = 255)
    private String deger;
    @Column(name = "guncelleme_zamani", nullable = false)
    private LocalDateTime guncellemeZamani;

    public void guncelle(String deger, LocalDateTime zaman) {
        this.deger = deger;
        this.guncellemeZamani = zaman;
    }
}
