package tr.edu.nobel.dto.response.activity;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StageCueDto(Scene scene, String organizationLabel, String candidateName, String awardLabel,
                          String categoryLabel, Boolean newAccount, Long committeeId, String committeeLabel,
                          Long expertId, String expertLabel, VoteValue vote, Integer votesCast, Integer votesRequired,
                          List<Member> members, List<Vote> votes, VoteValue result, Tally tally, String message,
                          Integer memberCount) {
    public StageCueDto {
        members = members == null ? null : List.copyOf(members);
        votes = votes == null ? null : List.copyOf(votes);
    }

    public enum Scene { NOMINATION, COMMITTEE_VOTE, DECISION_FINALIZED, CONSTRAINT_ERROR }

    public enum VoteValue { KABUL, RED, INCELEMEDE }

    public record Member(Long expertId, String label) { }
    public record Vote(Long expertId, VoteValue vote) { }
    public record Tally(int kabul, int red, int incelemede) { }
}
