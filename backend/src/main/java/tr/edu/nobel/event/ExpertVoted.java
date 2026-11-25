package tr.edu.nobel.event;

import tr.edu.nobel.entity.OyKarari;
import java.time.Instant;
import java.util.List;

public record ExpertVoted(Long komiteId, String komiteLabel, String kategoriLabel, Long uzmanId, String uzmanLabel,
                          Long adayId, String adayLabel, OyKarari karar, String olcut, int votesCast,
                          int votesRequired, int memberCount, List<MemberRef> members, List<VoteRef> votes,
                          Instant occurredAt) implements DomainEvent {
    public ExpertVoted {
        members = List.copyOf(members);
        votes = List.copyOf(votes);
    }
}
