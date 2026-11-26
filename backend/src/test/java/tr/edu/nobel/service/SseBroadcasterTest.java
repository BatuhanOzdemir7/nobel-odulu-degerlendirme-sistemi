package tr.edu.nobel.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tr.edu.nobel.config.EventsProperties;
import tr.edu.nobel.dto.response.activity.ActivityEventDto;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.Action;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.ActorRole;
import tr.edu.nobel.mapper.activity.ErHighlightCatalog;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;

class SseBroadcasterTest {
    @Test
    void isolatesSlowAndFailingClientAndStopsSendingToIt() throws Exception {
        var failed = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        RecordingEmitter bad = new RecordingEmitter() {
            @Override
            void accept(ActivityEventDto event) throws IOException {
                super.accept(event);
                try {
                    release.await();
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                } finally {
                    failed.countDown();
                }
                throw new IOException("Closed socket");
            }
        };
        var good = new RecordingEmitter();
        var emitters = new ArrayDeque<>(List.of(bad, good));
        var settings = new EventsProperties(5, 15);
        var stream = new SseBroadcaster(new ActivityEventBuffer(settings), settings, emitters::remove);
        try {
            stream.subscribe(null);
            stream.subscribe(null);
            stream.publish(event(1));
            assertThat(bad.events.poll(2, SECONDS)).isEqualTo(event(1));
            assertThat(good.events.poll(2, SECONDS)).isEqualTo(event(1));
            stream.publish(event(2));
            assertThat(good.events.poll(2, SECONDS)).isEqualTo(event(2));
            release.countDown();
            assertThat(failed.await(2, SECONDS)).isTrue();
            stream.publish(event(3));
            assertThat(good.events.poll(2, SECONDS)).isEqualTo(event(3));
            assertThat(bad.events.poll(200, java.util.concurrent.TimeUnit.MILLISECONDS)).isNull();
        } finally {
            release.countDown();
            stream.close();
        }
    }

    @Test
    void replaysOnlyNewerRetainedEventsBeforeLiveEvents() throws Exception {
        var listener = new RecordingEmitter();
        var settings = new EventsProperties(2, 15);
        var buffer = new ActivityEventBuffer(settings);
        var stream = new SseBroadcaster(buffer, settings, () -> listener);
        try {
            stream.publish(event(1));
            stream.publish(event(2));
            stream.publish(event(3));
            stream.subscribe("evt-2");
            stream.publish(event(4));
            assertThat(listener.events.poll(2, SECONDS)).isEqualTo(event(3));
            assertThat(listener.events.poll(2, SECONDS)).isEqualTo(event(4));
            assertThat(buffer.recent(10)).containsExactly(event(3), event(4));
        } finally {
            stream.close();
        }
    }

    private static ActivityEventDto event(int sequence) {
        return new ActivityEventDto("evt-" + sequence, LocalDateTime.of(2026, 11, 21, 14, 32, 10),
                Action.NOMINATION_CREATED, ActorRole.KURULUS, "CERN", "INSERT", ErHighlightCatalog.nomination(), null);
    }

    private static class RecordingEmitter extends SseEmitter {
        private final LinkedBlockingQueue<ActivityEventDto> events = new LinkedBlockingQueue<>();

        @Override
        public void send(SseEventBuilder builder) throws IOException {
            for (var item : builder.build()) {
                if (item.getData() instanceof ActivityEventDto activity) accept(activity);
            }
        }

        void accept(ActivityEventDto event) throws IOException {
            events.add(event);
        }
    }
}
