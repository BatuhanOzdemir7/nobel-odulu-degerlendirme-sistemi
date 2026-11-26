package tr.edu.nobel.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Generated;

import java.time.LocalDateTime;

@Entity
@Table(name = "kullanici")
@Getter
@Setter
@NoArgsConstructor
public class Kullanici {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "kullanici_id")
    private Long kullaniciId;

    @Column(name = "kullanici_adi", nullable = false, unique = true, length = 100)
    private String kullaniciAdi;

    @Column(name = "sifre_hash", nullable = false, length = 255)
    private String sifreHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "rol", nullable = false, length = 30)
    private Rol rol;

    @Column(name = "aktif", nullable = false)
    private boolean aktif = true;

    @Column(name = "kurulus_no", unique = true)
    private Long kurulusNo;

    @Column(name = "aday_id", unique = true)
    private Long adayId;

    @Column(name = "uzman_id", unique = true)
    private Long uzmanId;

    @Generated
    @Column(name = "olusturma_zamani", nullable = false, insertable = false, updatable = false)
    private LocalDateTime olusturmaZamani;
}
