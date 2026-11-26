package tr.edu.nobel.mapper.activity;

import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.activity.ActivityEventDto;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.Action;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.ActorRole;
import tr.edu.nobel.dto.response.activity.ErHighlightDto.Severity;
import tr.edu.nobel.event.CommitteeChangeEvent;
import java.time.LocalDateTime;

@Component
public class CommitteeChangeActivityMapper implements ActivityEventMapper<CommitteeChangeEvent> {
    @Override
    public Class<CommitteeChangeEvent> eventType() { return CommitteeChangeEvent.class; }

    @Override
    public ActivityEventDto map(CommitteeChangeEvent event, String id, LocalDateTime timestamp) {
        boolean membership = event.uzmanId() != null;
        var severity = switch (event.operation()) {
            case DELETED, MEMBER_REMOVED -> Severity.INFO;
            case CREATED, MEMBER_ADDED -> Severity.SUCCESS;
        };
        return new ActivityEventDto(id, timestamp, Action.valueOf("COMMITTEE_" + event.operation()), ActorRole.ADMIN,
                event.actorLabel(), SqlSummaryFormatter.committee(event), ErHighlightCatalog.committee(membership, severity),
                null);
    }
}
