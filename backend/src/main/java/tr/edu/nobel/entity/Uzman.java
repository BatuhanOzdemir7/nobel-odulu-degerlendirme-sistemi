package tr.edu.nobel.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "uzman")
@Data @NoArgsConstructor
public class Uzman {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "uzman_id")
    private Long uzmanId;
    @Column(name = "ad", nullable = false, length = 150)
    private String ad;
    @Column(name = "adres", nullable = false, columnDefinition = "text")
    private String adres;
    @Column(name = "yas", nullable = false)
    private Integer yas;
    @Column(name = "cinsiyet", nullable = false, length = 30)
    private String cinsiyet;
    @Column(name = "uzmanlik_alani", nullable = false, length = 150)
    private String uzmanlikAlani;
}
