package tr.edu.nobel.event;

import java.time.Instant;

public record CommitteeChangeEvent(Operation operation, Long komiteId, Long uzmanId, String komiteLabel,
                                   String uzmanLabel, String actorLabel, Instant occurredAt) implements DomainEvent {
    public enum Operation { CREATED, DELETED, MEMBER_ADDED, MEMBER_REMOVED }
}
