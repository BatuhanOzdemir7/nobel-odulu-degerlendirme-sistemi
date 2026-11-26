package tr.edu.nobel.mapper.activity;

import org.springframework.stereotype.Component;
import tr.edu.nobel.dto.response.activity.ActivityEventDto;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.Action;
import tr.edu.nobel.dto.response.activity.ActivityEventDto.ActorRole;
import tr.edu.nobel.event.ExpertVoted;
import java.time.LocalDateTime;

@Component
public class ExpertVoteActivityMapper implements ActivityEventMapper<ExpertVoted> {
    @Override
    public Class<ExpertVoted> eventType() { return ExpertVoted.class; }

    @Override
    public ActivityEventDto map(ExpertVoted event, String id, LocalDateTime timestamp) {
        return new ActivityEventDto(id, timestamp, Action.EXPERT_VOTED, ActorRole.UZMAN,
                event.uzmanLabel(), SqlSummaryFormatter.vote(event), ErHighlightCatalog.vote(),
                StageCueMapper.vote(event));
    }
}
