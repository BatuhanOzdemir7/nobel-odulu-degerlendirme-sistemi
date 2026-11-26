package tr.edu.nobel.controller;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tr.edu.nobel.dto.response.activity.ActivityEventDto;
import tr.edu.nobel.service.ActivityEventBuffer;
import tr.edu.nobel.service.SseBroadcaster;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class ActivityStreamController {
    private final ActivityEventBuffer buffer;
    private final SseBroadcaster broadcaster;

    public ActivityStreamController(ActivityEventBuffer buffer, SseBroadcaster broadcaster) {
        this.buffer = buffer;
        this.broadcaster = broadcaster;
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestHeader(value = "Last-Event-ID", required = false) String lastEventId,
                             HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-cache");
        response.setHeader("X-Accel-Buffering", "no");
        return broadcaster.subscribe(lastEventId);
    }

    @GetMapping("/recent")
    public List<ActivityEventDto> recent(@RequestParam(defaultValue = "10") int limit) {
        return buffer.recent(limit);
    }
}
