package tr.edu.nobel.dto.response.activity;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ActivityEventDto(String eventId, LocalDateTime timestamp, Action action, ActorRole actorRole,
                               String actorLabel, String sqlSummary, ErHighlightDto erHighlight, StageCueDto stageCue) {
    public enum Action {
        NOMINATION_CREATED, EXPERT_VOTED, DECISION_FINALIZED, REGISTRY_CREATED, REGISTRY_UPDATED, REGISTRY_DELETED,
        COMMITTEE_CREATED, COMMITTEE_DELETED, COMMITTEE_MEMBER_ADDED, COMMITTEE_MEMBER_REMOVED, CONSTRAINT_VIOLATION
    }

    public enum ActorRole { ADMIN, KURULUS, ADAY, UZMAN, SYSTEM }
}
