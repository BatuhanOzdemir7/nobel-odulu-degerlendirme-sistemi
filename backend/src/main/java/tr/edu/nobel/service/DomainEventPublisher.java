package tr.edu.nobel.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import tr.edu.nobel.event.DomainEvent;
import tr.edu.nobel.mapper.activity.ActivityEventFactory;

@Component
public class DomainEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(DomainEventPublisher.class);
    private final ActivityEventFactory factory;
    private final SseBroadcaster broadcaster;

    public DomainEventPublisher(ActivityEventFactory factory, SseBroadcaster broadcaster) {
        this.factory = factory;
        this.broadcaster = broadcaster;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public synchronized void publish(DomainEvent event) {
        try {
            broadcaster.publish(factory.create(event));
        } catch (RuntimeException failure) {
            log.warn("Olay akışa aktarılamadı: {}", event.getClass().getSimpleName(), failure);
        }
    }
}
