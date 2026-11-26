package tr.edu.nobel.mapper.activity;

import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.activity.ActivityEventDto;
import tr.edu.nobel.event.DomainEvent;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class ActivityEventFactory {
    private final Map<Class<?>, ActivityEventMapper<?>> mappers;
    private final Clock clock;
    private final AtomicLong sequence = new AtomicLong();

    public ActivityEventFactory(List<ActivityEventMapper<?>> mappers, Clock clock) {
        this.mappers = mappers.stream().collect(Collectors.toUnmodifiableMap(ActivityEventMapper::eventType,
                Function.identity()));
        this.clock = clock;
    }

    public ActivityEventDto create(DomainEvent event) {
        var mapper = mappers.get(event.getClass());
        if (mapper == null) {
            throw new IllegalArgumentException("Olay eşleyicisi bulunamadı: " + event.getClass().getSimpleName());
        }
        return mapper.mapEvent(event, "evt-" + sequence.incrementAndGet(),
                LocalDateTime.ofInstant(event.occurredAt(), clock.getZone()));
    }
}
