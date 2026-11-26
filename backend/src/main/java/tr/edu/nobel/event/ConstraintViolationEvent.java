package tr.edu.nobel.event;

import java.time.Instant;
import java.util.List;

public record ConstraintViolationEvent(String sqlState, String constraintName, String message, Long komiteId,
                                       String actorLabel, Instant occurredAt, String tableName,
                                       CommitteeContext context) implements DomainEvent {
    public ConstraintViolationEvent(String sqlState, String constraintName, String message, Long komiteId,
                                    String actorLabel, Instant occurredAt) {
        this(sqlState, constraintName, message, komiteId, actorLabel, occurredAt, null, null);
    }

    public record CommitteeContext(String committeeLabel, String expertLabel, List<MemberRef> members) {
        public CommitteeContext { members = List.copyOf(members); }
    }
}
