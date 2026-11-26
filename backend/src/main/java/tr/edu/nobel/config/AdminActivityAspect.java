package tr.edu.nobel.config;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.ApiResponse;
import tr.edu.nobel.entity.Rol;
import tr.edu.nobel.event.AdminMutationEvent;
import tr.edu.nobel.event.CommitteeChangeEvent;
import tr.edu.nobel.mapper.activity.RegistryActivityResource;
import tr.edu.nobel.service.ActivityActor;
import tr.edu.nobel.service.CommitteeActivityContext;
import java.time.Clock;
import java.util.function.Consumer;

@Aspect
@Component
// The advice surrounds the transaction interceptor so a failed commit never emits a success.
@Order(Ordered.HIGHEST_PRECEDENCE + 100)
public class AdminActivityAspect {
    private static final Logger log = LoggerFactory.getLogger(AdminActivityAspect.class);
    private static final String REGISTRY = "execution(* tr.edu.nobel.service.RegistryService+.";
    private static final String COMMITTEE = "execution(* tr.edu.nobel.service.CommitteeService+.";
    private static final String COMMITTEE_DELETE = COMMITTEE + "delete(..)) && args(id)";

    private final ApplicationEventPublisher events;
    private final ActivityActor actors;
    private final CommitteeActivityContext committees;
    private final Clock clock;
    private final ThreadLocal<String> deletedCommitteeLabel = new ThreadLocal<>();

    public AdminActivityAspect(ApplicationEventPublisher events, ActivityActor actors,
                               CommitteeActivityContext committees, Clock clock) {
        this.events = events;
        this.actors = actors;
        this.committees = committees;
        this.clock = clock;
    }

    @AfterReturning(pointcut = REGISTRY + "create(..)) && args(resource, *)", returning = "response")
    public void registryCreated(String resource, ApiResponse response) {
        asAdmin(actor -> {
            var table = RegistryActivityResource.fromResource(resource).orElseThrow();
            Long id = ((Number) response.values().get(table.responseId)).longValue();
            publishRegistry(resource, AdminMutationEvent.Operation.CREATED, id, actor);
        });
    }

    @AfterReturning(REGISTRY + "delete(..)) && args(resource, id)")
    public void registryDeleted(String resource, Long id) {
        asAdmin(actor -> publishRegistry(resource, AdminMutationEvent.Operation.DELETED, id, actor));
    }

    @AfterReturning(pointcut = COMMITTEE + "create(..))", returning = "response")
    public void committeeCreated(ApiResponse response) {
        asAdmin(actor -> events.publishEvent(new CommitteeChangeEvent(CommitteeChangeEvent.Operation.CREATED,
                ((Number) response.values().get("komiteId")).longValue(), null,
                (String) response.values().get("komiteAdi"), null, actor.label(), clock.instant())));
    }

    @Around(COMMITTEE_DELETE)
    public Object captureDeletedLabel(ProceedingJoinPoint call, Long id) throws Throwable {
        try {
            asAdmin(actor -> deletedCommitteeLabel.set(committees.committeeLabel(id)));
            return call.proceed();
        } finally {
            deletedCommitteeLabel.remove();
        }
    }

    @AfterReturning(COMMITTEE_DELETE)
    public void committeeDeleted(Long id) {
        asAdmin(actor -> events.publishEvent(new CommitteeChangeEvent(CommitteeChangeEvent.Operation.DELETED,
                id, null, deletedCommitteeLabel.get(), null, actor.label(), clock.instant())));
    }

    @AfterReturning(COMMITTEE + "addMember(..)) && args(id, expertId)")
    public void memberAdded(Long id, Long expertId) {
        memberChanged(CommitteeChangeEvent.Operation.MEMBER_ADDED, id, expertId);
    }

    @AfterReturning(COMMITTEE + "removeMember(..)) && args(id, expertId)")
    public void memberRemoved(Long id, Long expertId) {
        memberChanged(CommitteeChangeEvent.Operation.MEMBER_REMOVED, id, expertId);
    }

    private void publishRegistry(String resource, AdminMutationEvent.Operation operation, Long id,
                                 ActivityActor.Actor actor) {
        events.publishEvent(new AdminMutationEvent(resource, operation, id, actor.role(), actor.label(), clock.instant()));
    }

    private void memberChanged(CommitteeChangeEvent.Operation operation, Long id, Long expertId) {
        asAdmin(actor -> events.publishEvent(new CommitteeChangeEvent(operation, id, expertId,
                committees.committeeLabel(id), committees.expertLabel(expertId), actor.label(), clock.instant())));
    }

    private void asAdmin(Consumer<ActivityActor.Actor> action) {
        try {
            var actor = actors.current();
            if (actor != null && actor.role() == Rol.ADMIN) action.accept(actor);
        } catch (RuntimeException failure) {
            log.warn("Yönetim işlemi olay akışına aktarılamadı.", failure);
        }
    }
}
