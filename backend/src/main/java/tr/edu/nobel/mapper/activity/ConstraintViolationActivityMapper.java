package tr.edu.nobel.mapper.activity;

import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.activity.ActivityEventDto;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.Action;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.ActorRole;
import tr.edu.nobel.event.ConstraintViolationEvent;
import tr.edu.nobel.exception.ConstraintViolationClassifier;
import java.time.LocalDateTime;

@Component
public class ConstraintViolationActivityMapper implements ActivityEventMapper<ConstraintViolationEvent> {
    @Override
    public Class<ConstraintViolationEvent> eventType() { return ConstraintViolationEvent.class; }

    @Override
    public ActivityEventDto map(ConstraintViolationEvent event, String id, LocalDateTime timestamp) {
        var violation = ConstraintViolationClassifier.classify(
                event.sqlState(), event.constraintName(), event.tableName(), event.message());
        return new ActivityEventDto(id, timestamp, Action.CONSTRAINT_VIOLATION, ActorRole.SYSTEM,
                event.actorLabel() == null ? "Sistem" : event.actorLabel(),
                SqlSummaryFormatter.constraint(violation.sqlState(), violation.message()),
                ErHighlightCatalog.constraint(violation.committeeRelated(), violation.tableName()),
                StageCueMapper.constraint(event, violation.message()));
    }
}
