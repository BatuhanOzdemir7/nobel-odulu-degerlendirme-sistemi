package tr.edu.nobel.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "komite_uyesi")
@Data @NoArgsConstructor
public class KomiteUyesi {
    @EmbeddedId
    private KomiteUyesiId id;
}
