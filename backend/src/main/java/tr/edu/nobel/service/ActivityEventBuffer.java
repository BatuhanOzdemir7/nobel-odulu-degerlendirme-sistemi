package tr.edu.nobel.service;

import org.springframework.stereotype.Component;
import tr.edu.nobel.config.EventsProperties;
import tr.edu.nobel.dto.response.activity.ActivityEventDto;

import java.util.ArrayDeque;
import java.util.List;

@Component
public class ActivityEventBuffer {
    private final int capacity;
    private final ArrayDeque<ActivityEventDto> events = new ArrayDeque<>();

    public ActivityEventBuffer(EventsProperties properties) {
        this.capacity = properties.bufferSize();
    }

    public synchronized void add(ActivityEventDto event) {
        if (events.size() == capacity) events.removeFirst();
        events.addLast(event);
    }

    public synchronized List<ActivityEventDto> recent(int limit) {
        return events.stream().skip(Math.max(0, events.size() - Math.max(0, limit))).toList();
    }

    public synchronized List<ActivityEventDto> after(String lastEventId) {
        long lastSequence = sequence(lastEventId);
        if (lastSequence < 0) return List.of();
        return events.stream().filter(event -> sequence(event.eventId()) > lastSequence).toList();
    }

    private static long sequence(String id) {
        if (id == null || !id.startsWith("evt-")) return -1;
        try {
            return Long.parseUnsignedLong(id, 4, id.length(), 10);
        } catch (NumberFormatException ignored) {
            return -1;
        }
    }
}
