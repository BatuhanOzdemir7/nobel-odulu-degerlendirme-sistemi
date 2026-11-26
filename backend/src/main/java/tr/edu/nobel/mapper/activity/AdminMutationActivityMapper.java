package tr.edu.nobel.mapper.activity;

import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.activity.ActivityEventDto;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.Action;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.ActorRole;
import tr.edu.nobel.dto.response.activity.ErHighlightDto.Severity;
import tr.edu.nobel.event.AdminMutationEvent;
import java.time.LocalDateTime;

@Component
public class AdminMutationActivityMapper implements ActivityEventMapper<AdminMutationEvent> {
    @Override
    public Class<AdminMutationEvent> eventType() { return AdminMutationEvent.class; }

    @Override
    public ActivityEventDto map(AdminMutationEvent event, String id, LocalDateTime timestamp) {
        var resource = RegistryActivityResource.fromResource(event.resource()).orElseThrow();
        var severity = event.operation() == AdminMutationEvent.Operation.DELETED ? Severity.INFO : Severity.SUCCESS;
        return new ActivityEventDto(id, timestamp, Action.valueOf("REGISTRY_" + event.operation()),
                ActorRole.valueOf(event.actorRole().name()), event.actorLabel(),
                SqlSummaryFormatter.registry(resource, event.operation(), event.entityId()),
                ErHighlightCatalog.registry(resource, severity), null);
    }
}
