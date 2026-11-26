package tr.edu.nobel.mapper.activity;

import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.activity.ActivityEventDto;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.Action;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.ActorRole;
import tr.edu.nobel.event.NominationRecorded;
import java.time.LocalDateTime;

@Component
public class NominationActivityMapper implements ActivityEventMapper<NominationRecorded> {
    @Override
    public Class<NominationRecorded> eventType() { return NominationRecorded.class; }

    @Override
    public ActivityEventDto map(NominationRecorded event, String id, LocalDateTime timestamp) {
        return new ActivityEventDto(id, timestamp, Action.NOMINATION_CREATED, ActorRole.KURULUS,
                event.kurulusLabel(), SqlSummaryFormatter.nomination(event), ErHighlightCatalog.nomination(),
                StageCueMapper.nomination(event));
    }
}
