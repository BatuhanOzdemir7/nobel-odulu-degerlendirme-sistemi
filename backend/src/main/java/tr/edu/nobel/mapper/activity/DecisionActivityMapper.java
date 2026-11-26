package tr.edu.nobel.mapper.activity;

import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.activity.ActivityEventDto;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.Action;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.ActorRole;
import tr.edu.nobel.event.DecisionFinalized;
import java.time.LocalDateTime;

@Component
public class DecisionActivityMapper implements ActivityEventMapper<DecisionFinalized> {
    @Override
    public Class<DecisionFinalized> eventType() { return DecisionFinalized.class; }

    @Override
    public ActivityEventDto map(DecisionFinalized event, String id, LocalDateTime timestamp) {
        var role = event.otomatik() ? ActorRole.SYSTEM : ActorRole.UZMAN;
        return new ActivityEventDto(id, timestamp, Action.DECISION_FINALIZED, role,
                event.otomatik() ? "Sistem" : "Uzman", SqlSummaryFormatter.decision(event), ErHighlightCatalog.decision(),
                StageCueMapper.decision(event));
    }
}
