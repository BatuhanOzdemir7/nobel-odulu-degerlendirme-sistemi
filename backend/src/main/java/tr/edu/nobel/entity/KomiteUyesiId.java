package tr.edu.nobel.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Embeddable
@Data @NoArgsConstructor
public class KomiteUyesiId implements Serializable {
    @Column(name = "komite_id")
    private Long komiteId;
    @Column(name = "uzman_id")
    private Long uzmanId;
}
