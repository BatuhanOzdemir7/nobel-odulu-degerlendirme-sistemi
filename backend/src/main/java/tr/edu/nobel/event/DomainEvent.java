package tr.edu.nobel.event;

import java.time.Instant;

public interface DomainEvent {
    Instant occurredAt();
}
