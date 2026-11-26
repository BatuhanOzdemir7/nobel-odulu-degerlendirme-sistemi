package tr.edu.nobel.mapper.activity;

import tr.edu.nobel.dto.response.activity.ActivityEventDto;
import tr.edu.nobel.event.DomainEvent;
import java.time.LocalDateTime;

public interface ActivityEventMapper<E extends DomainEvent> {
    Class<E> eventType();
    ActivityEventDto map(E event, String eventId, LocalDateTime timestamp);

    default ActivityEventDto mapEvent(DomainEvent event, String eventId, LocalDateTime timestamp) {
        return map(eventType().cast(event), eventId, timestamp);
    }
}
