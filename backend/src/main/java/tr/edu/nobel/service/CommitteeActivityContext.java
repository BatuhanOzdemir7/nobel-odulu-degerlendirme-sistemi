package tr.edu.nobel.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tr.edu.nobel.event.ConstraintViolationEvent.CommitteeContext;
import tr.edu.nobel.repository.KomiteUyesiRepository;

@Service
@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW, timeout = 2)
public class CommitteeActivityContext {
    private final JdbcTemplate jdbc;
    private final KomiteUyesiRepository members;

    public CommitteeActivityContext(JdbcTemplate jdbc, KomiteUyesiRepository members) {
        this.jdbc = jdbc;
        this.members = members;
    }

    public String committeeLabel(Long id) {
        return jdbc.query("SELECT komite_adi FROM degerlendirme_komitesi WHERE komite_id = ?",
                rs -> rs.next() ? rs.getString(1) : null, id);
    }

    public String expertLabel(Long id) {
        return jdbc.query("SELECT ad FROM uzman WHERE uzman_id = ?", rs -> rs.next() ? rs.getString(1) : null, id);
    }

    public CommitteeContext find(Long committeeId, Long expertId) {
        String label = committeeLabel(committeeId);
        return label == null ? null : new CommitteeContext(label, expertId == null ? null : expertLabel(expertId),
                members.findMembers(committeeId));
    }
}
