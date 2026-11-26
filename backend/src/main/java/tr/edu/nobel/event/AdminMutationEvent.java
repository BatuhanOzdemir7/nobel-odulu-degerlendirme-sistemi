package tr.edu.nobel.event;

import tr.edu.nobel.entity.Rol;
import java.time.Instant;

public record AdminMutationEvent(String resource, Operation operation, Long entityId, Rol actorRole,
                                 String actorLabel, Instant occurredAt) implements DomainEvent {
    public enum Operation { CREATED, UPDATED, DELETED }
}
