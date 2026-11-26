package tr.edu.nobel.service;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tr.edu.nobel.config.EventsProperties;
import tr.edu.nobel.dto.response.activity.ActivityEventDto;

import java.io.IOException;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;

@Service
@EnableConfigurationProperties(EventsProperties.class)
public class SseBroadcaster {
    private static final Logger log = LoggerFactory.getLogger(SseBroadcaster.class);
    private final ActivityEventBuffer buffer;
    private final Supplier<SseEmitter> emitterFactory;
    private final int backlog;
    private final CopyOnWriteArrayList<Client> clients = new CopyOnWriteArrayList<>();
    private final ScheduledThreadPoolExecutor dispatch = new ScheduledThreadPoolExecutor(1,
            Thread.ofPlatform().daemon().name("activity-dispatch").factory());

    @Autowired
    public SseBroadcaster(ActivityEventBuffer buffer, EventsProperties properties) {
        this(buffer, properties, () -> new SseEmitter(0L));
    }

    SseBroadcaster(ActivityEventBuffer buffer, EventsProperties properties, Supplier<SseEmitter> emitterFactory) {
        this.buffer = buffer;
        this.emitterFactory = emitterFactory;
        this.backlog = Math.max(64, properties.bufferSize()) + 1;
        dispatch.scheduleWithFixedDelay(this::heartbeat, properties.heartbeatSeconds(), properties.heartbeatSeconds(),
                TimeUnit.SECONDS);
    }

    public SseEmitter subscribe(String lastEventId) {
        var client = new Client(emitterFactory.get());
        client.emitter.onCompletion(() -> disconnect(client));
        client.emitter.onTimeout(() -> disconnect(client));
        client.emitter.onError(error -> disconnect(client));
        try {
            dispatch.execute(() -> register(client, lastEventId));
        } catch (RejectedExecutionException closed) {
            client.emitter.complete();
        }
        return client.emitter;
    }

    public void publish(ActivityEventDto event) {
        dispatch.execute(() -> {
            buffer.add(event);
            clients.forEach(client -> send(client, activity(event)));
        });
    }

    private void register(Client client, String lastEventId) {
        send(client, SseEmitter.event().reconnectTime(3000));
        buffer.after(lastEventId).forEach(event -> send(client, activity(event)));
        clients.add(client);
        if (client.closed.get()) clients.remove(client);
        client.sender.start();
    }

    private SseEmitter.SseEventBuilder activity(ActivityEventDto event) {
        return SseEmitter.event().id(event.eventId()).name("activity").data(event, MediaType.APPLICATION_JSON);
    }

    private void heartbeat() {
        clients.forEach(client -> send(client, SseEmitter.event().comment(" heartbeat")));
    }

    private void send(Client client, SseEmitter.SseEventBuilder event) {
        if (!client.closed.get() && !client.outbox.offer(event)) disconnect(client);
    }

    private void disconnect(Client client) {
        if (client.closed.compareAndSet(false, true)) {
            clients.remove(client);
            if (Thread.currentThread() != client.sender) client.sender.interrupt();
        }
    }

    @PreDestroy
    public synchronized void close() {
        if (!dispatch.isShutdown()) {
            dispatch.execute(() -> clients.forEach(this::disconnect));
            dispatch.shutdown();
        }
    }

    // A single dispatcher orders replay, heartbeats and live messages. Each connection drains
    // its own bounded queue so a blocked servlet write cannot stop another client or a commit.
    private final class Client {
        private final SseEmitter emitter;
        private final ArrayBlockingQueue<SseEmitter.SseEventBuilder> outbox = new ArrayBlockingQueue<>(backlog);
        private final AtomicBoolean closed = new AtomicBoolean();
        private final Thread sender = Thread.ofVirtual().name("activity-sender").unstarted(this::drain);

        private Client(SseEmitter emitter) { this.emitter = emitter; }

        private void drain() {
            boolean transportFailed = false;
            try {
                while (!closed.get()) emitter.send(outbox.take());
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            } catch (IOException disconnected) {
                // Servlet MVC completes the request on an I/O failure.
                transportFailed = true;
            } catch (RuntimeException failure) {
                transportFailed = true;
                if (!closed.get()) {
                    log.debug("Canlı olay istemciye gönderilemedi.", failure);
                    emitter.completeWithError(failure);
                }
            } finally {
                disconnect(this);
                if (!transportFailed) emitter.complete();
            }
        }
    }
}
